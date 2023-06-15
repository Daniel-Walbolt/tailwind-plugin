import type { App } from 'vue';
import FullPageLayout from './layout/FullPageLayout.vue';

export function loadAppVueComponents(app: App<any>)
{
    app.component('FullPageLayout', FullPageLayout);
}