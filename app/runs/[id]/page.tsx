import { RunLoader } from "@/components/sandbox/run-loader"

export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  const { id } = await params
  return <RunLoader id={id} />
}
