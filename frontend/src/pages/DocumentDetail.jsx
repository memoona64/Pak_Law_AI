import { useParams } from "react-router-dom"
import PlaceholderPage from "./PlaceholderPage"

export default function DocumentDetail() {
  const { id } = useParams()
  return <PlaceholderPage title={`Document: ${id}`} />
}
