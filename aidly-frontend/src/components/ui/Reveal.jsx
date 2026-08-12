import useReveal from '../../hooks/useReveal';

// Wraps content that should fade/slide into place the first time it
// scrolls into the viewport, instead of appearing all at once on load.
export default function Reveal({ children, delay = 0, className = '', as = 'div', style, ...rest }) {
  const [ref, visible] = useReveal();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
      style={{ ...style, transitionDelay: visible ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
