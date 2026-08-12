export default function Card({ tight, hover, className = '', children, ...rest }) {
  const classes = ['card', tight ? 'card-tight' : '', hover ? 'card-hover' : '', className]
    .filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
