# AI Development Rules - ToqDesk

## Tech Stack
- **Framework**: React 18 with Vite and TypeScript.
- **Styling**: Tailwind CSS for all styling, following the design system defined in `src/index.css`.
- **UI Components**: shadcn/ui (built on Radix UI primitives) for accessible and consistent components.
- **Icons**: Lucide React for all iconography.
- **Routing**: React Router DOM (v6+) for navigation, with routes centralized in `src/App.tsx`.
- **State Management**: TanStack Query (React Query) for server state and caching.
- **Backend & Auth**: Supabase for database, authentication, storage, and Edge Functions.
- **Forms**: React Hook Form combined with Zod for schema validation.
- **Notifications**: Sonner for toast notifications.
- **Utilities**: date-fns for date manipulation and Recharts for data visualization.

## Library Usage Rules
- **UI Components**: Always check `src/components/ui/` before creating new components. Use shadcn/ui patterns.
- **Icons**: Use only `lucide-react`. Do not install other icon libraries.
- **Data Fetching**: Use `useQuery` and `useMutation` from TanStack Query. Do not use `useEffect` for data fetching.
- **Styling**: Use Tailwind utility classes. Avoid inline styles or CSS modules unless absolutely necessary.
- **Forms**: Use the `Form` component from shadcn/ui which integrates `react-hook-form` and `zod`.
- **Dates**: Always use `date-fns` for formatting and calculations. Use the `ptBR` locale for display.
- **Toasts**: Use `toast` from `sonner` for user feedback.
- **Database**: Interact with Supabase using the client in `src/integrations/supabase/client.ts`.
- **Auth**: Use the `useAuth` hook from `src/integrations/supabase/auth.tsx` to access user session and roles.
- **Drag and Drop**: Use `@dnd-kit` for any Kanban or sortable list functionality.

## Architecture Guidelines
- **Pages**: Place top-level views in `src/pages/`.
- **Components**: Place reusable UI elements in `src/components/`.
- **Types**: Define shared interfaces in `src/types/`.
- **Hooks**: Place custom logic in `src/hooks/`.
- **Simplicity**: Prioritize readability and maintainability. Keep components focused and under 100 lines when possible.