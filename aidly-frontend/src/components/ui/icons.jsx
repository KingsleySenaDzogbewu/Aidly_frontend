// Minimal, dependency-free line-icon set (24x24 viewBox, stroke=currentColor).
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Icon({ children, size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = (p) => <Icon {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1V15a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4.5a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V10" /></Icon>;
export const IconVideo = (p) => <Icon {...p}><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m21.5 8-6 4 6 4Z" /></Icon>;
export const IconBook = (p) => <Icon {...p}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h13" /><path d="M8 7h7M8 10.5h7" /></Icon>;
export const IconQuiz = (p) => <Icon {...p}><path d="M9 11.5a3 3 0 1 1 3.6 2.94c-.6.13-1.1.62-1.1 1.31V16" /><circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" /><rect x="3" y="3" width="18" height="18" rx="4" /></Icon>;
export const IconNotes = (p) => <Icon {...p}><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 16.5h5" /></Icon>;
export const IconBell = (p) => <Icon {...p}><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></Icon>;
export const IconCalendar = (p) => <Icon {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Icon>;
export const IconRoute = (p) => <Icon {...p}><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M6 16.8V13a4 4 0 0 1 4-4h2a4 4 0 0 0 4-4v-.2" strokeDasharray="2.5 3.5" /></Icon>;
export const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>;
export const IconSchool = (p) => <Icon {...p}><path d="m12 3 9.5 5-9.5 5-9.5-5Z" /><path d="M6.5 10.7V16c0 1.5 2.46 3 5.5 3s5.5-1.5 5.5-3v-5.3" /><path d="M21.5 8v6" /></Icon>;
export const IconShield = (p) => <Icon {...p}><path d="M12 3.5 19 6v6c0 5-3 8-7 9-4-1-7-4-7-9V6Z" /><path d="m9 12 2 2 4-4.3" /></Icon>;
export const IconLogout = (p) => <Icon {...p}><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" /><path d="M14 15.5 19 12l-5-3.5" /><path d="M19 12H9" /></Icon>;
export const IconMenu = (p) => <Icon {...p}><path d="M3.5 6h17M3.5 12h17M3.5 18h17" /></Icon>;
export const IconClose = (p) => <Icon {...p}><path d="m5 5 14 14M19 5 5 19" /></Icon>;
export const IconEye = (p) => <Icon {...p}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></Icon>;
export const IconEyeOff = (p) => <Icon {...p}><path d="M3 3l18 18" /><path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a15.6 15.6 0 0 1-3.4 4.2M6.6 6.6C4 8.3 2 12 2 12s3.5 6.5 10 6.5a10.4 10.4 0 0 0 3.4-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>;
export const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="m5 13 4 4 10-10" /></Icon>;
export const IconMap = (p) => <Icon {...p}><path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" /><path d="M9 4.5v13M15 6.5v13" /></Icon>;
export const IconCar = (p) => <Icon {...p}><path d="M4.5 16v-3.2L6.7 8a2 2 0 0 1 1.8-1.1h7a2 2 0 0 1 1.8 1.1l2.2 4.8V16" /><rect x="3" y="16" width="18" height="3.5" rx="1.3" /><circle cx="7.5" cy="19.5" r="1.4" /><circle cx="16.5" cy="19.5" r="1.4" /></Icon>;
export const IconChevronRight = (p) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const IconChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const IconTrash = (p) => <Icon {...p}><path d="M4 7h16M9.5 7V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M6.5 7l.7 12a1.6 1.6 0 0 0 1.6 1.5h6.4a1.6 1.6 0 0 0 1.6-1.5l.7-12" /></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>;
export const IconChat = (p) => <Icon {...p}><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" /><path d="M8 10h8M8 13h5" /></Icon>;
export const IconMegaphone = (p) => <Icon {...p}><path d="M4 10v4a1 1 0 0 0 1 1h2l8 4.5v-15L7 9H5a1 1 0 0 0-1 1Z" /><path d="M7 15l1.5 4.5h2.5L9.8 15.6" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /></Icon>;
export const IconInbox = (p) => <Icon {...p}><path d="M4 12h4.2l1.4 3h4.8l1.4-3H20" /><path d="M5.5 5h13l1.5 7v6a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18v-6Z" /></Icon>;
export const IconFile = (p) => <Icon {...p}><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /></Icon>;
export const IconDownload = (p) => <Icon {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M5 18.5h14" /></Icon>;
export const IconUpload = (p) => <Icon {...p}><path d="M12 15V4m0 0-4 4m4-4 4 4" /><path d="M5 18.5h14" /></Icon>;
export const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
export const IconWarn = (p) => <Icon {...p}><path d="M12 3.5 21.5 20h-19Z" /><path d="M12 9.5V14" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" /></Icon>;
export const IconTrophy = (p) => <Icon {...p}><path d="M8 4h8v5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4Z" /><path d="M8 5H5.5A2.5 2.5 0 0 0 8 9.5M16 5h2.5A2.5 2.5 0 0 1 16 9.5" /><path d="M12 13v3.5" /><path d="M9 20h6" /><path d="M10.5 20c0-1.8.7-3 1.5-3.5.8.5 1.5 1.7 1.5 3.5" /></Icon>;
