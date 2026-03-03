import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronsUpDown, Lock, Globe, Link as LinkIcon } from 'lucide-react';
import { useGitHubRepos, GitHubRepo } from '@/hooks/useGitHubRepos';
import { Input } from '@/components/ui/input';

interface RepoDropdownProps {
  value: string;
  onSelect: (repo: { fullName: string; isPrivate: boolean }) => void;
  disabled?: boolean;
}

export function RepoDropdown({ value, onSelect, disabled }: RepoDropdownProps) {
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const { repos, isLoading, search, setSearch, loadMore, hasMore, error } = useGitHubRepos();

  if (manualMode) {
    return (
      <div className="space-y-2">
        <Input
          placeholder="owner/repo or GitHub URL"
          value={manualInput}
          onChange={(e) => {
            setManualInput(e.target.value);
            // Parse and pass up
            const match = e.target.value.match(/(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
            if (match) {
              onSelect({ fullName: match[1], isPrivate: false });
            }
          }}
          className="font-mono"
        />
        <button
          type="button"
          onClick={() => {
            setManualMode(false);
            setManualInput('');
          }}
          className="text-xs text-muted-foreground underline font-mono"
        >
          Back to repo list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-mono text-sm"
          >
            {value || 'Select a repository...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search repos..."
              value={search}
              onValueChange={setSearch}
              className="font-mono"
            />
            <CommandList>
              {isLoading && repos.length === 0 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <div className="px-4 py-3 text-sm text-destructive font-mono">{error}</div>
              )}
              <CommandEmpty>No repos found.</CommandEmpty>
              <CommandGroup>
                {repos.map((repo: GitHubRepo) => (
                  <CommandItem
                    key={repo.fullName}
                    value={repo.fullName}
                    onSelect={() => {
                      onSelect({ fullName: repo.fullName, isPrivate: repo.isPrivate });
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.isPrivate ? (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-mono text-sm truncate">{repo.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {repo.language && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {hasMore && (
                  <CommandItem
                    onSelect={() => loadMore()}
                    className="justify-center text-muted-foreground"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Load more...'
                    )}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => setManualMode(true)}
        className="text-xs text-muted-foreground underline font-mono flex items-center gap-1"
      >
        <LinkIcon className="h-3 w-3" />
        Enter a URL manually
      </button>
    </div>
  );
}
