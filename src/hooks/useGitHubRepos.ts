import { useState, useEffect, useCallback, useRef } from 'react';
import { invokeFunction } from '@/lib/supabaseHelpers';

export interface GitHubRepo {
  name: string;
  fullName: string;
  isPrivate: boolean;
  description: string | null;
  language: string | null;
  updatedAt: string;
  defaultBranch: string;
  stargazersCount: number;
}

interface RepoListResponse {
  repos: GitHubRepo[];
  hasMore: boolean;
}

export function useGitHubRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  const fetchRepos = useCallback(async (query: string, pageNum: number, append: boolean) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await invokeFunction<RepoListResponse>('list-github-repos', {
      query: query || undefined,
      page: pageNum,
      perPage: 30,
    });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      setRepos((prev) => append ? [...prev, ...data.repos] : data.repos);
      setHasMore(data.hasMore);
    }

    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchRepos('', 1, false);
    }
  }, [fetchRepos]);

  // Debounced search
  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchRepos(search, 1, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchRepos]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRepos(search, nextPage, true);
  }, [hasMore, isLoading, page, search, fetchRepos]);

  const refetch = useCallback(() => {
    setPage(1);
    fetchRepos(search, 1, false);
  }, [search, fetchRepos]);

  return {
    repos,
    isLoading,
    search,
    setSearch,
    loadMore,
    hasMore,
    error,
    refetch,
  };
}
