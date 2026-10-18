import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFacilitatorData } from './facilitatorApi.js';

const EMPTY = {
  status: 'loading',
  source: null,
  error: null,
  students: [],
  skipped: 0,
  courses: [],
  coursesSource: 'none',
  coursesError: null,
  opportunities: [],
  opportunitiesError: null,
};

/** Loads dashboard data once and exposes reload(). Ignores results that arrive after unmount. */
export function useFacilitatorData({ dataSource = 'auto', fetchImpl } = {}) {
  const [state, setState] = useState(EMPTY);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, status: 'loading' }));
    const result = await loadFacilitatorData({ dataSource, fetchImpl });
    if (id === requestId.current) setState({ status: 'ready', ...result });
  }, [dataSource, fetchImpl]);

  useEffect(() => {
    reload();
    return () => {
      requestId.current += 1; // invalidate in-flight request on unmount/change
    };
  }, [reload]);

  return { ...state, reload };
}
