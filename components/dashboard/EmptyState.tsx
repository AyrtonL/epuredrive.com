interface Props {
  message: string
  action?: React.ReactNode
}

export default function EmptyState({ message, action }: Props) {
  return (
    <div className="text-center py-20 text-white/30">
      <p className="text-base mb-4">{message}</p>
      {action}
    </div>
  )
}
