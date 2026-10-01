import { lazy } from 'react';
import { useLanguage } from '../context/LanguageContext';
import computerIcon from '../assets/images/This_PC_1995.svg';
import helpIcon from '../assets/images/help.png';

// Pulled into their own chunks: only fetched if the user actually opens them.
const OutlookExpress = lazy(() => import('./apps/OutlookExpress'));
const SystemProperties = lazy(() => import('./apps/SystemProperties'));
const DisplayProperties = lazy(() => import('./apps/DisplayProperties'));
const Welcome = lazy(() => import('./apps/Welcome'));

export const SETTINGS_IDS = ['systemproperties', 'displayproperties', 'welcome'];

// The windows opened from the Start menu / Run box that are not desktop icons.
export const useStartActions = (onOpenWindow) => {
    const { t } = useLanguage();
    const dialog = { resizable: false, bodyStyle: { padding: 0 } };

    return {
        openSystemProperties: () => onOpenWindow(t('start.systemProperties'), <SystemProperties />, {
            id: 'systemproperties', width: '430px', height: '470px', minWidth: '430px', minHeight: '470px', ...dialog,
            icon: <img src={computerIcon} alt="" />
        }),
        openDisplayProperties: () => onOpenWindow(t('start.displayProperties'), <DisplayProperties />, {
            id: 'displayproperties', width: '440px', height: '500px', minWidth: '440px', minHeight: '500px', ...dialog,
            icon: <img src={computerIcon} alt="" />
        }),
        openWelcome: () => onOpenWindow(t('welcome.title'), <Welcome />, {
            id: 'welcome', width: '520px', height: '400px', minWidth: '420px', minHeight: '340px',
            bodyStyle: { padding: 0 }, icon: <img src={helpIcon} alt="" />
        }),
        openDocuments: () => onOpenWindow(t('start.documents'), <div>{t('start.documentsStub')}</div>, { id: 'documents' }),
        openHelp: () => onOpenWindow('New Message', <OutlookExpress />, {
            width: '500px', height: '400px', icon: <img src={helpIcon} alt="" />
        })
    };
};
