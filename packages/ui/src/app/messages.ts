/** The default sentence for each state of each application part. One plain sentence each; the caller can replace any of them. */
export const appWords = {
  chart: { empty: 'No data for this period.', loading: 'Loading the chart.', error: 'Could not load the chart.' },
  activity: { empty: 'No activity yet.', loading: 'Loading recent activity.', error: 'Could not load recent activity.' },
  dashboard: { empty: 'Nothing has run yet, so there is nothing to total.', loading: 'Loading the dashboard.', error: 'Could not load the dashboard.' },
} as const;

/** The state every list, table, chart and panel in the application kit can be in. */
export type PartState = 'default' | 'empty' | 'loading' | 'error';
