import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Grid2x2Check, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/matches", label: "AI Matches" },
  { to: "/trades", label: "Trades" },
  { to: "/safety", label: "Safety" },
] as const;

export function SiteHeader() {
  const { user, profile, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = NAV.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={() => setOpen(false)}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      activeProps={{ className: "text-foreground" }}
    >
      {item.label}
    </Link>
  ));

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Grid2x2Check className="size-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">BarterGrid</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">{links}</nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/listings/new">
                  <Plus className="size-4" /> Post listing
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar className="size-9 border border-border">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>
                        {(profile?.display_name ?? user.email ?? "??").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.display_name ?? user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/listings/new">Post a listing</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/trades">My trades</Link>
                  </DropdownMenuItem>
                  {isStaff && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Moderation</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-10 flex flex-col gap-1 px-2">
                {links}
                {user && (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
