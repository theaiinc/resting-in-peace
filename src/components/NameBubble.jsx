export function NameBubble({ name }) {
  if (!name) return null
  return (
    <div className="name-bubble">{name}</div>
  )
}
