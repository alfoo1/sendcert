import BlogShell from '@/components/blog/BlogShell';

export default function BlogLayoutEs({ children }: { children: React.ReactNode }) {
  return <BlogShell locale="es">{children}</BlogShell>;
}
