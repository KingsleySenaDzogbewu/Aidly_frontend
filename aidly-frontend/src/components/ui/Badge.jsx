const STATUS_VARIANTS = {
  // generic
  DRAFT: 'neutral', PUBLISHED: '', ARCHIVED: 'neutral',
  // booking
  PENDING: 'warning', CONFIRMED: '', COMPLETED: '', CANCELLED: 'danger',
  // live session
  SCHEDULED: '', IN_PROGRESS: 'info',
  // question
  ANSWERED: '', CLOSED: 'neutral',
  // student status
  ACTIVE: '', INACTIVE: 'neutral', SUSPENDED: 'danger', GRADUATED: 'info',
  // vehicle
  AVAILABLE: '', IN_USE: 'info', MAINTENANCE: 'warning', OUT_OF_SERVICE: 'danger',
  // notification
  SENT: '', FAILED: 'danger',
  // driving assessment result
  PASSED: '', NEEDS_IMPROVEMENT: 'warning',
};

export default function Badge({ children, variant, status, className = '' }) {
  const resolved = variant ?? (status ? STATUS_VARIANTS[status] ?? '' : '');
  const classes = ['badge', resolved ? `badge-${resolved}` : '', className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}
