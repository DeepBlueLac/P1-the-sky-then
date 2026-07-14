import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/global.css';
import SkyExperience from '@/app/index';

createRoot(document.getElementById('root')!).render(<StrictMode><SkyExperience /></StrictMode>);
