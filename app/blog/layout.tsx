import BlogShell from '@/components/blog/BlogShell';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogShell locale="en">{children}</BlogShell>;
}
