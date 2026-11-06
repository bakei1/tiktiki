import { supabase, friendlyDataError } from './supabase.js'

const TASK_FIELDS = [
  'id',
  'list_id',
  'title',
  'note',
  'completed',
  'priority',
  'due_date',
  'tags',
  'assignee_id',
  'created_at',
  'completed_at',
]

const LIST_FIELDS = [
  'id',
  'name',
  'description',
  'color',
  'position',
  'is_shared',
  'invite_code',
  'created_at',
]

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function pick(source, fields) {
  const result = {}
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field]
    }
  }
  return result
}

function throwIf(error) {
  if (error) throw new Error(friendlyDataError(error))
}

/**
 * All rows are scoped to the signed-in user and protected by RLS. The
 * publishable/anon key is the only key that ever reaches the browser.
 *
 * Accounts start with no lists or tasks. Users create only the content they need.
 */
export function createSupabaseRepository(userId) {
  async function load() {
    const [listsResult, tasksResult, membersResult, messagesResult] = await Promise.all([
      supabase
        .from('lists')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('list_members')
        .select('*')
        .order('joined_at', { ascending: true }),
      supabase
        .from('channel_messages')
        .select('*')
        .order('created_at', { ascending: true }),
    ])

    throwIf(listsResult.error)
    throwIf(tasksResult.error)
    throwIf(membersResult.error)
    throwIf(messagesResult.error)

    const lists = listsResult.data || []
    const tasks = tasksResult.data || []

    return {
      lists,
      tasks,
      members: membersResult.data || [],
      messages: messagesResult.data || [],
    }
  }

  return {
    mode: 'supabase',
    load,
    async createList(list) {
      const row = pick(list, LIST_FIELDS)
      const { data, error } = await supabase.rpc('create_list', {
        p_id: row.id,
        p_name: row.name,
        p_description: row.description,
        p_color: row.color,
        p_position: row.position,
        p_is_shared: row.is_shared,
        p_invite_code: row.invite_code,
      })
      throwIf(error)
      return data
    },
    async updateList(id, patch) {
      const row = pick(patch, LIST_FIELDS.filter((field) => field !== 'id'))
      const { data, error } = await supabase
        .from('lists')
        .update(row)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()
      throwIf(error)
      return data
    },
    async deleteList(id) {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      throwIf(error)
    },
    async createTask(task) {
      const row = { ...pick(task, TASK_FIELDS), user_id: userId }
      const { data, error } = await supabase.from('tasks').insert(row).select('*').single()
      throwIf(error)
      return data
    },
    async updateTask(id, patch) {
      const row = pick(patch, TASK_FIELDS.filter((field) => field !== 'id'))
      const { data, error } = await supabase
        .from('tasks')
        .update(row)
        .eq('id', id)
        .select('*')
        .single()
      throwIf(error)
      return data
    },
    async deleteTask(id) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
      throwIf(error)
    },
    async setTaskAssignee(id, assigneeId, expectedAssigneeId) {
      let query = supabase
        .from('tasks')
        .update({ assignee_id: assigneeId })
        .eq('id', id)
      query = expectedAssigneeId
        ? query.eq('assignee_id', expectedAssigneeId)
        : query.is('assignee_id', null)
      const { data, error } = await query.select('*').maybeSingle()
      throwIf(error)
      if (!data) throw new Error('Görev başka biri tarafından üstlenilmiş olabilir.')
      return data
    },
    async joinListByCode(code) {
      const { data, error } = await supabase.rpc('join_list_by_code', { p_code: code })
      throwIf(error)
      return data
    },
    async sendMessage(message) {
      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          list_id: message.list_id,
          user_id: userId,
          body: message.body,
        })
        .select('*')
        .single()
      throwIf(error)
      return data
    },
    subscribe(onChange) {
      const channel = supabase
        .channel(`tik-sync-${userId}-${makeId()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lists' },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'list_members' },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channel_messages' },
          onChange,
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    },
  }
}
