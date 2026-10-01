import { linkify } from '../linkify';

// Text with links and e-mail addresses made clickable (only http(s) and mailto: ever are).
const LinkedText = ({ text }) => linkify(text).map((part, i) => (
    part.type === 'text'
        ? <span key={i}>{part.value}</span>
        : <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="msg-link">{part.value}</a>
));

export default LinkedText;
