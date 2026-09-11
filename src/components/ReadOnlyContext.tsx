import { createContext, useContext } from 'react'

// 只读查看模式的门控开关：默认 false，主应用行为不变；只读分享页包一层 true。
// TaskGraph/TaskGraphNode 等组件在内部消费，隐藏变更入口并短路持久化回调。
export const ReadOnlyContext = createContext(false)

export function useReadOnly() {
  return useContext(ReadOnlyContext)
}
