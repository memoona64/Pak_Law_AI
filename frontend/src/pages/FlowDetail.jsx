import { useParams } from "react-router-dom"
import PlaceholderPage from "./PlaceholderPage"

export default function FlowDetail() {
  const { slug } = useParams()
  return <PlaceholderPage title={`Flow: ${slug}`} />
}
