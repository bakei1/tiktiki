import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ListTodo, MessageCircle, Plus } from 'lucide-react'

import AuthScreen from './components/AuthScreen.jsx'
import ChannelAccessModal from './components/ChannelAccessModal.jsx'
import ChannelChat from './components/ChannelChat.jsx'
import Composer from './components/Composer.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import Header from './components/Header.jsx'
import HelpModal from './components/HelpModal.jsx'
import ListModal from './components/ListModal.jsx'
import Rail from './components/Rail.jsx'
import RightPanel from './components/RightPanel.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Sidebar from './components/Sidebar.jsx'
import TaskModal from './components/TaskModal.jsx'
import {
  ChannelIntro,
  DateDivider,
  EmptyState,
  TaskItem,
} from './components/Tasks.jsx'
import Toasts from './components/Toasts.jsx'
import { DataError, Splash } from './components/Splash.jsx'
import { createSupabaseRepository } from './lib/repository.js'
import { friendlyDataError, isSupabaseConfigured, supabase } from './lib/supabase.js'
import {
  addDaysISO,
  dateKey,
  dividerLabel,
  initials,
  todayISO,
} from './lib/dates.js'

const MAX_TOASTS = 3

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const byCreated = (a, b) => String(a.created_at).localeCompare(String(b.created_at))

function smartTasks(tasks, type) {
  const today = todayISO()
  if (type === 'today') {
    return tasks.filter(
      (task) =>
        task.due_date &&
        task.due_date <= today &&
        (!task.completed || task.due_date === today),
    )
  }
  if (type === 'upcoming') {
    return tasks.filter(
      (task) => !task.completed && task.due_date && task.due_date > today,
    )
  }
  if (type === 'completed') {
    return tasks.filter((task) => task.completed)
  }
  return tasks
}

export default function App() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState(undefined)

  const [lists, setLists] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [dataReady, setDataReady] = useState(false)
  const [dataError, setDataError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [view, setView] = useState({ type: 'list', id: null })
  const [channelTab, setChannelTab] = useState('tasks')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [modal, setModal] = useState(null)
  const [toasts, setToasts] = useState([])

  const repoRef = useRef(null)
  const tasksRef = useRef(tasks)
  const listsRef = useRef(lists)
  const searchRef = useRef(null)
  const composerRef = useRef(null)
  const scrollRef = useRef(null)
  const toastTimers = useRef(new Map())
  const pendingScroll = useRef(false)
  const handledInviteCode = useRef('')

  const needsAuth = isSupabaseConfigured && authReady && !session

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    listsRef.current = lists
  }, [lists])

  // Remove demo-era browser data from older versions.
  useEffect(() => {
    try {
      localStorage.removeItem('tik.demo.v1')
      localStorage.removeItem('tik.demo-mode.v1')
    } catch {
      // Storage may be unavailable; nothing else depends on it.
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true)
      return undefined
    }

    let alive = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return
        setSession(data.session)
        setAuthReady(true)
      })
      .catch(() => {
        if (alive) setAuthReady(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady || needsAuth) return undefined

    let cancelled = false
    let unsubscribe = null
    let realtimeTimer = null
    const userId = session?.user?.id
    if (!userId) return undefined

    const repo = createSupabaseRepository(userId)
    repoRef.current = repo
    setDataReady(false)
    setDataError('')
    setLists([])
    setTasks([])
    setMembers([])
    setMessages([])

    const load = async () => {
      try {
        const data = await repo.load()
        if (cancelled) return
        setLists(data.lists)
        setTasks(data.tasks)
        setMembers(data.members)
        setMessages(data.messages)
        setDataReady(true)

        unsubscribe = repo.subscribe(() => {
          window.clearTimeout(realtimeTimer)
          realtimeTimer = window.setTimeout(async () => {
            try {
              const fresh = await repo.load()
              if (cancelled) return
              setLists(fresh.lists)
              setTasks(fresh.tasks)
              setMembers(fresh.members)
              setMessages(fresh.messages)
            } catch {
              // A transient realtime refresh failure should not blank the UI.
            }
          }, 280)
        })
      } catch (error) {
        if (cancelled) return
        setDataError(friendlyDataError(error))
        setDataReady(true)
      }
    }

    load()

    return () => {
      cancelled = true
      window.clearTimeout(realtimeTimer)
      unsubscribe?.()
    }
  }, [authReady, needsAuth, session?.user?.id, reloadKey])


  useEffect(() => {
    if (!dataReady) return
    if (!lists.length) {
      if (view.type === 'list') setView({ type: 'all' })
      return
    }
    if (view.type === 'list' && !lists.some((list) => list.id === view.id)) {
      setView({ type: 'list', id: lists[0].id })
    }
  }, [dataReady, lists, view.type, view.id])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = 0
  }, [view.type, view.id])

  useEffect(() => {
    if (!pendingScroll.current || !scrollRef.current) return
    pendingScroll.current = false
    requestAnimationFrame(() => {
      const node = scrollRef.current
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    })
  }, [tasks])

  useEffect(() => {
    if (!query) return
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [query])

  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const dismissToast = (id) => {
    const timer = toastTimers.current.get(id)
    if (timer) window.clearTimeout(timer)
    toastTimers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const pushToast = (message, options = {}) => {
    const id = makeId()
    const toast = {
      id,
      message,
      tone: options.tone || 'default',
      actionLabel: options.actionLabel || null,
      onAction: options.onAction || null,
    }
    setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), toast])
    const timer = window.setTimeout(
      () => dismissToast(id),
      options.duration || (options.actionLabel ? 7000 : 4200),
    )
    toastTimers.current.set(id, timer)
    return id
  }

  const handleToastAction = (toast) => {
    toast.onAction?.()
    dismissToast(toast.id)
  }

  const effectiveProfile = useMemo(() => {
    const user = session?.user
    const name =
      user?.user_metadata?.username ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Sen'
    return {
      name,
      initials: initials(name),
      avatar_url: user?.user_metadata?.avatar_url || null,
      email: user?.email || null,
    }
  }, [session])

  const currentList = useMemo(
    () => (view.type === 'list' ? lists.find((list) => list.id === view.id) : null),
    [lists, view],
  )

  const meta = useMemo(() => {
    if (view.type === 'list') {
      return {
        kind: 'list',
        title: currentList?.name || 'genel',
        description:
          currentList?.description ||
          'Görevlerini kanallara ayır. Her kanal kendi akışında kalsın.',
        color: currentList?.color || 'lime',
      }
    }
    if (view.type === 'today') {
      return {
        kind: 'today',
        title: 'Bugün',
        description: 'Bugün bitmesi gerekenler ve gecikenler. Küçük başla.',
        color: 'lime',
      }
    }
    if (view.type === 'upcoming') {
      return {
        kind: 'upcoming',
        title: 'Yaklaşan',
        description: 'Tarihi olan, henüz vakti gelmemiş görevler.',
        color: 'sky',
      }
    }
    if (view.type === 'completed') {
      return {
        kind: 'completed',
        title: 'Tamamlanan',
        description: 'Tamamlananların sessiz arşivi. İyi işler burada.',
        color: 'lilac',
      }
    }
    return {
      kind: 'all',
      title: 'Tüm görevler',
      description: 'Bütün kanallardaki görevler tek akışta.',
      color: 'peach',
    }
  }, [view, currentList])

  const scopedTasks = useMemo(() => {
    if (view.type === 'list') {
      return tasks.filter((task) => task.list_id === view.id)
    }
    return smartTasks(tasks, view.type)
  }, [tasks, view])

  const visibleBeforeStatus = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR')
    return scopedTasks.filter((task) => {
      if (selectedTag && !(task.tags || []).includes(selectedTag)) return false
      if (!needle) return true
      return [task.title, task.note, ...(task.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(needle)
    })
  }, [scopedTasks, query, selectedTag])

  const counts = useMemo(
    () => ({
      all: visibleBeforeStatus.length,
      open: visibleBeforeStatus.filter((task) => !task.completed).length,
      done: visibleBeforeStatus.filter((task) => task.completed).length,
    }),
    [visibleBeforeStatus],
  )

  const effectiveStatus = meta.kind === 'completed' ? 'all' : status

  const filteredTasks = useMemo(() => {
    const sorted = [...visibleBeforeStatus]
    if (meta.kind === 'completed') {
      sorted.sort((a, b) =>
        String(b.completed_at || b.created_at).localeCompare(
          String(a.completed_at || a.created_at),
        ),
      )
    } else {
      sorted.sort(byCreated)
    }
    if (effectiveStatus === 'open') return sorted.filter((task) => !task.completed)
    if (effectiveStatus === 'done') return sorted.filter((task) => task.completed)
    return sorted
  }, [visibleBeforeStatus, effectiveStatus, meta.kind])

  const groups = useMemo(() => {
    const result = []
    for (const task of filteredTasks) {
      const source =
        meta.kind === 'completed' ? task.completed_at || task.created_at : task.created_at
      const key = dateKey(source)
      let group = result[result.length - 1]
      if (!group || group.key !== key) {
        group = { key, label: dividerLabel(source), tasks: [] }
        result.push(group)
      }
      group.tasks.push(task)
    }
    return result
  }, [filteredTasks, meta.kind])

  const destination = useMemo(() => {
    if (view.type === 'list') return currentList || null
    return lists.find((list) => list.name === 'genel') || lists[0] || null
  }, [lists, currentList, view.type])

  const defaultDue =
    meta.kind === 'today' ? todayISO() : meta.kind === 'upcoming' ? addDaysISO(1) : null

  const todayStats = useMemo(() => {
    const today = todayISO()
    const relevant = tasks.filter(
      (task) =>
        task.due_date &&
        task.due_date <= today &&
        (!task.completed || task.due_date === today),
    )
    return {
      total: relevant.length,
      done: relevant.filter((task) => task.completed).length,
    }
  }, [tasks])

  const viewKey = view.type === 'list' ? `list:${view.id}` : view.type
  const hasFilters = Boolean(
    query.trim() ||
      selectedTag ||
      (status !== 'all' && meta.kind !== 'completed'),
  )

  function selectView(next, { keepFilters = false } = {}) {
    setView(next)
    setChannelTab('tasks')
    setMobileSidebar(false)
    if (!keepFilters) {
      setStatus('all')
      setQuery('')
      setSelectedTag(null)
    }
  }

  function openNewTask(options = {}) {
    if (!lists.length) {
      setModal({ type: 'list' })
      return
    }
    const listId =
      options.listId ||
      currentList?.id ||
      destination?.id ||
      lists[0].id
    setModal({
      type: 'task',
      defaults: {
        listId,
        due: Object.prototype.hasOwnProperty.call(options, 'due')
          ? options.due
          : defaultDue,
      },
    })
  }

  async function addTask(input) {
    const listId = input.list_id || destination?.id
    if (!listId) {
      pushToast('Önce bir kanal oluştur.', { tone: 'error' })
      return
    }
    const task = {
      id: makeId(),
      list_id: listId,
      user_id: session?.user?.id,
      title: input.title.trim(),
      note: input.note || null,
      completed: false,
      priority: input.priority || 'normal',
      due_date: input.due_date || null,
      tags: input.tags || [],
      assignee_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    }

    setTasks((current) => [...current, task])
    pendingScroll.current = true

    if (view.type === 'completed') {
      setView({ type: 'list', id: listId })
      setStatus('all')
      setQuery('')
      setSelectedTag(null)
    }

    try {
      await repoRef.current?.createTask(task)
    } catch (error) {
      setTasks((current) => current.filter((item) => item.id !== task.id))
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  async function updateTask(id, patch) {
    const previous = tasksRef.current.find((task) => task.id === id)
    if (!previous) return
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    )
    try {
      await repoRef.current?.updateTask(id, patch)
    } catch (error) {
      setTasks((current) =>
        current.map((task) => (task.id === id ? previous : task)),
      )
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  function toggleTask(task) {
    const completed = !task.completed
    updateTask(task.id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
  }

  async function toggleTaskClaim(task) {
    const currentUserId = session?.user?.id
    if (!currentUserId || (task.assignee_id && task.assignee_id !== currentUserId)) return
    const nextAssigneeId = task.assignee_id === currentUserId ? null : currentUserId
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, assignee_id: nextAssigneeId } : item,
      ),
    )
    try {
      await repoRef.current?.setTaskAssignee(task.id, nextAssigneeId, task.assignee_id || null)
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, assignee_id: task.assignee_id || null } : item,
        ),
      )
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  async function sendChannelMessage(body) {
    if (!currentList || !session?.user?.id) return
    const message = {
      id: makeId(),
      list_id: currentList.id,
      user_id: session.user.id,
      body,
      created_at: new Date().toISOString(),
    }
    setMessages((current) => [...current, message])
    try {
      const saved = await repoRef.current?.sendMessage(message)
      if (saved) setMessages((current) => current.map((item) => item.id === message.id ? saved : item))
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== message.id))
      pushToast(friendlyDataError(error), { tone: 'error' })
      throw error
    }
  }

  async function joinChannelByCode(code) {
    try {
      const listId = await repoRef.current.joinListByCode(code)
      const fresh = await repoRef.current.load()
      setLists(fresh.lists)
      setTasks(fresh.tasks)
      setMembers(fresh.members)
      setMessages(fresh.messages)
      setView({ type: 'list', id: listId })
      setChannelTab('chat')
      setModal(null)
      pushToast('Ortak kanala katıldın.')
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      window.history.replaceState({}, '', url.toString())
    } catch (error) {
      throw new Error(friendlyDataError(error))
    }
  }

  const pendingInviteCode = new URLSearchParams(window.location.search).get('join')
  useEffect(() => {
    if (!pendingInviteCode || !dataReady || needsAuth || !repoRef.current) return
    if (handledInviteCode.current === pendingInviteCode) return
    handledInviteCode.current = pendingInviteCode
    joinChannelByCode(pendingInviteCode).catch((error) => {
      pushToast(error.message || 'Davet bağlantısı kullanılamadı.', { tone: 'error' })
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      window.history.replaceState({}, '', url.toString())
    })
  }, [pendingInviteCode, dataReady, needsAuth, session?.user?.id])

  async function deleteTask(task) {
    setTasks((current) => current.filter((item) => item.id !== task.id))
    try {
      await repoRef.current?.deleteTask(task.id)
      pushToast('Görev silindi.', {
        actionLabel: 'Geri al',
        duration: 8000,
        onAction: () => restoreTask(task),
      })
    } catch (error) {
      setTasks((current) => [...current, task].sort(byCreated))
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  async function restoreTask(task) {
    setTasks((current) => [...current.filter((item) => item.id !== task.id), task].sort(byCreated))
    try {
      await repoRef.current?.createTask(task)
      pushToast('Görev geri getirildi.')
    } catch (error) {
      setTasks((current) => current.filter((item) => item.id !== task.id))
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  async function saveList(existing, values) {
    if (existing) {
      const previous = listsRef.current.find((list) => list.id === existing.id)
      setLists((current) =>
        current.map((list) => (list.id === existing.id ? { ...list, ...values } : list)),
      )
      try {
        await repoRef.current?.updateList(existing.id, values)
      } catch (error) {
        setLists((current) =>
          current.map((list) => (list.id === existing.id ? previous : list)),
        )
        pushToast(friendlyDataError(error), { tone: 'error' })
      }
      return
    }

    const list = {
      id: makeId(),
      user_id: session?.user?.id,
      name: values.name,
      description: values.description,
      color: values.color,
      position: listsRef.current.length,
      is_shared: Boolean(values.is_shared),
      invite_code: values.is_shared ? makeId().replaceAll('-', '') : null,
      created_at: new Date().toISOString(),
    }
    setLists((current) => [...current, list])
    selectView({ type: 'list', id: list.id })
    try {
      await repoRef.current?.createList(list)
      pushToast(
        list.is_shared
          ? `#${list.name} ortak kanalı açıldı. Menüden davet bağlantısını paylaşabilirsin.`
          : `#${list.name} kanalı açıldı.`,
      )
    } catch (error) {
      setLists((current) => current.filter((item) => item.id !== list.id))
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  function askDeleteList(list) {
    const affected = tasksRef.current.filter((task) => task.list_id === list.id).length
    setModal({
      type: 'confirm',
      title: `#${list.name} silinsin mi?`,
      message: 'Kanaldaki bütün görevler de silinir. Bu işlem geri alınamaz.',
      detail: `${affected} görev etkilenecek`,
      confirmLabel: 'Listeyi sil',
      onConfirm: () => deleteList(list),
    })
  }

  async function deleteList(list) {
    const removedLists = listsRef.current
    const removedTasks = tasksRef.current.filter((task) => task.list_id === list.id)
    setLists((current) => current.filter((item) => item.id !== list.id))
    setTasks((current) => current.filter((task) => task.list_id !== list.id))
    if (view.type === 'list' && view.id === list.id) {
      setView({ type: 'all' })
    }
    try {
      await repoRef.current?.deleteList(list.id)
      pushToast(`#${list.name} silindi.`)
    } catch (error) {
      setLists(removedLists)
      setTasks((current) => [...current, ...removedTasks].sort(byCreated))
      pushToast(friendlyDataError(error), { tone: 'error' })
    }
  }

  async function handleSaveProfile(name) {
    if (!supabase) return false
    const { data, error } = await supabase.auth.updateUser({
      data: { username: name, full_name: name },
    })
    if (error) {
      pushToast(friendlyDataError(error), { tone: 'error' })
      return false
    }
    setSession((current) => (current ? { ...current, user: data.user } : current))
    pushToast('Profil güncellendi.')
    return true
  }

  async function signOut() {
    setModal(null)
    await supabase?.auth.signOut()
    setSession(null)
    setDataReady(false)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (modal) return
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable)

      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (
        (event.key === 'n' || event.key === 'N') &&
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault()
        openNewTask()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!authReady) {
      document.title = 'tık.'
    } else if (needsAuth) {
      document.title = 'Giriş · tık.'
    } else if (dataError) {
      document.title = 'Bağlantı sorunu · tık.'
    } else if (!dataReady) {
      document.title = 'Yükleniyor · tık.'
    } else {
      document.title = `${meta.title} · tık.`
    }
  }, [authReady, needsAuth, dataError, dataReady, meta.title])

  if (!isSupabaseConfigured) {
    return (
      <DataError
        message="Uygulama bağlantısı yapılandırılmamış. Ayarları kontrol edip yeniden dene."
        onRetry={() => window.location.reload()}
        onSignOut={null}
      />
    )
  }

  if (!authReady) return <Splash label="Oturum kontrol ediliyor…" />
  if (needsAuth) return <AuthScreen />
  if (!dataReady) return <Splash label="Görevlerin yükleniyor…" />
  if (dataError) {
    return (
      <DataError
        message={dataError}
        onRetry={() => {
          setDataError('')
          setDataReady(false)
          setReloadKey((key) => key + 1)
        }}
        onSignOut={signOut}
      />
    )
  }

  const showList = meta.kind !== 'list'

  return (
    <div className="app-shell">
      <Rail
        view={view}
        onSelectView={(type) => selectView({ type })}
        onNewList={() => setModal({ type: 'list' })}
        onHelp={() => setModal({ type: 'help' })}
      />

      <button
        type="button"
        className={`sidebar-scrim ${mobileSidebar ? 'is-visible' : ''}`}
        onClick={() => setMobileSidebar(false)}
        aria-label="Menüyü kapat"
        tabIndex={mobileSidebar ? 0 : -1}
      />

      <Sidebar
        lists={lists}
        tasks={tasks}
        view={view}
        onSelectList={(id) => selectView({ type: 'list', id })}
        onSelectView={(type) => selectView({ type })}
        onNewTask={() => openNewTask()}
        onNewList={() => setModal({ type: 'list' })}
        onEditList={(list) => setModal({ type: 'list', list })}
        onDeleteList={askDeleteList}
        onInvite={(list) => setModal({ type: 'channel-share', list })}
        onJoinChannel={() => setModal({ type: 'channel-join' })}
        currentUserId={session?.user?.id}
        onOpenSettings={() => setModal({ type: 'settings' })}
        profile={effectiveProfile}
        todayStats={todayStats}
        mobileOpen={mobileSidebar}
        onClose={() => setMobileSidebar(false)}
      />

      <main className="chat-main">
        <Header
          meta={meta}
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          counts={counts}
          onOpenSidebar={() => setMobileSidebar(true)}
          onNewTask={() => openNewTask()}
          searchRef={searchRef}
        />

        {view.type === 'list' ? (
          <div className="channel-mode-tabs" role="tablist" aria-label="Kanal görünümü">
            <button
              type="button"
              role="tab"
              aria-selected={channelTab === 'tasks'}
              className={channelTab === 'tasks' ? 'is-active' : ''}
              onClick={() => setChannelTab('tasks')}
            >
              <ListTodo size={15} /> Görevler
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={channelTab === 'chat'}
              className={channelTab === 'chat' ? 'is-active' : ''}
              onClick={() => setChannelTab('chat')}
            >
              <MessageCircle size={15} /> Sohbet
              {currentList?.is_shared ? <span>ortak</span> : null}
            </button>
          </div>
        ) : null}

        {view.type === 'list' && channelTab === 'chat' ? (
          <ChannelChat
            list={currentList}
            messages={messages}
            members={members}
            currentUser={{ ...effectiveProfile, id: session?.user?.id }}
            onSend={sendChannelMessage}
          />
        ) : <div className="chat-content">
          <div className="messages-scroll" ref={scrollRef}>
            <div className="messages-inner">
              <ChannelIntro
                key={viewKey}
                meta={meta}
                scopedTasks={scopedTasks}
                onNewTask={() => openNewTask()}
                onViewToday={() => selectView({ type: 'today' })}
              />

              {groups.map((group) => (
                <Fragment key={group.key}>
                  <DateDivider label={group.label} />
                  {group.tasks.map((task) => {
                    const authorMember = members.find(
                      (member) => member.list_id === task.list_id && member.user_id === task.user_id,
                    )
                    const authorName = authorMember?.username ||
                      (task.user_id === session?.user?.id ? effectiveProfile.name : 'Kanal üyesi')
                    const taskProfile = {
                      ...effectiveProfile,
                      name: authorName,
                      initials: initials(authorName),
                    }
                    const assignee = members.find(
                      (member) => member.list_id === task.list_id && member.user_id === task.assignee_id,
                    )
                    const taskList = lists.find((item) => item.id === task.list_id)
                    return (
                      <TaskItem
                        key={task.id}
                        task={task}
                        list={taskList}
                        profile={taskProfile}
                        assignee={assignee}
                        canClaim={Boolean(taskList?.is_shared)}
                        currentUserId={session?.user?.id}
                        showList={showList}
                        completedView={meta.kind === 'completed'}
                        onToggle={toggleTask}
                        onEdit={(item) => setModal({ type: 'task', task: item })}
                        onDelete={deleteTask}
                        onClaim={toggleTaskClaim}
                      />
                    )
                  })}
                </Fragment>
              ))}

              {filteredTasks.length === 0 ? (
                <EmptyState
                  hasFilters={hasFilters}
                  onNewTask={() => openNewTask()}
                  onClearFilters={() => {
                    setQuery('')
                    setStatus('all')
                    setSelectedTag(null)
                  }}
                />
              ) : null}

              <div className="messages-end" />
            </div>
          </div>

          <div className="composer-area">
            {meta.kind === 'completed' ? (
              <Composer
                meta={meta}
                destination={destination}
                locked
                onUnlock={() => selectView({ type: 'today' })}
              />
            ) : destination ? (
              <Composer
                key={viewKey}
                meta={meta}
                destination={destination}
                defaultDue={defaultDue}
                onCreate={(input) =>
                  addTask({
                    ...input,
                    list_id: destination.id,
                  })
                }
                onOpenFull={() =>
                  openNewTask({ listId: destination.id, due: defaultDue })
                }
                inputRef={composerRef}
                isSmartView={meta.kind !== 'list'}
              />
            ) : (
              <div className="composer-locked">
                <span className="composer-locked-icon">
                  <Plus size={17} />
                </span>
                <div>
                  <strong>Henüz bir kanal yok.</strong>
                  <span> İlk kanalı aç, akış başlasın.</span>
                </div>
                <button
                  type="button"
                  className="button button-accent button-small"
                  onClick={() => setModal({ type: 'list' })}
                >
                  Kanal oluştur
                </button>
              </div>
            )}
          </div>
        </div>}
      </main>

      <RightPanel
        scopedTasks={scopedTasks}
        lists={lists}
        selectedTag={selectedTag}
        onSelectTag={(tag) => setSelectedTag((current) => (current === tag ? null : tag))}
        onOpenTask={(task) => setModal({ type: 'task', task })}
        onViewToday={() => selectView({ type: 'today' })}
      />

      <Toasts
        toasts={toasts}
        onDismiss={dismissToast}
        onAction={handleToastAction}
      />

      {modal?.type === 'task' ? (
        <TaskModal
          task={modal.task || null}
          lists={lists}
          defaultListId={modal.defaults?.listId || destination?.id}
          defaultDue={modal.defaults?.due ?? null}
          onClose={() => setModal(null)}
          onSave={(values) => {
            if (modal.task) {
              updateTask(modal.task.id, values)
            } else {
              addTask(values)
            }
          }}
          onDelete={deleteTask}
        />
      ) : null}

      {modal?.type === 'list' ? (
        <ListModal
          list={modal.list || null}
          existingLists={lists}
          onClose={() => setModal(null)}
          onSave={(values) => saveList(modal.list, values)}
          onDelete={askDeleteList}
        />
      ) : null}

      {modal?.type === 'channel-share' ? (
        <ChannelAccessModal
          mode="share"
          list={modal.list}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.type === 'channel-join' ? (
        <ChannelAccessModal
          mode="join"
          onClose={() => setModal(null)}
          onJoin={joinChannelByCode}
        />
      ) : null}

      {modal?.type === 'confirm' ? (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          detail={modal.detail}
          confirmLabel={modal.confirmLabel}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.type === 'settings' ? (
        <SettingsModal
          profile={effectiveProfile}
          email={effectiveProfile.email}
          onClose={() => setModal(null)}
          onSaveProfile={handleSaveProfile}
          onSignOut={signOut}
        />
      ) : null}

      {modal?.type === 'help' ? (
        <HelpModal onClose={() => setModal(null)} />
      ) : null}
    </div>
  )
}
