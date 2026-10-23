interface Props {
  title: string
  description?: string
  badge?: string
}

export default function SectionHeader({ title, description, badge }: Props) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <h2 className="section-title">{title}</h2>
        {badge && <span className="badge badge-blue">{badge}</span>}
      </div>
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}
