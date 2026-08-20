import { OwnerShell } from "@/components/owner/shell";

export default function OwnerLayout({ children }: LayoutProps<"/">) {
  return <OwnerShell>{children}</OwnerShell>;
}
