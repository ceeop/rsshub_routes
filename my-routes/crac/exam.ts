import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/exam',
    categories: ['government'],
    example: '/crac/exam',
    parameters: {},
    radar: [{ source: ['zhipu.allspectrum.cn:9528/CRAC/crac/pages/list_examMsg.html'], target: '/crac/exam' }],
    name: '考试信息',
    maintainers: ['lhteen'],
    handler: async () => {
        const response = await ofetch('https://zhipu.allspectrum.cn:9528/CRAC/app/exam_advice/examAdviceList', {
            method: 'POST',
            body: {
                req: {
                    type: 1,
                    page_no: 1,
                    page_size: 10
                }
            }
        });

        const list = response.res?.list || [];

        const items = list.map((item) => {
            const encodeStr = (str: string | number) => Buffer.from(String(str)).toString('base64');
            const link = `https://zhipu.allspectrum.cn:9528/CRAC/crac/pages/list_detail.html?id=${encodeStr(item.id)}&type=${encodeStr(1)}`;
            
            return {
                title: item.name,
                description: item.content,
                pubDate: parseDate(item.createDate),
                link: link,
            };
        });

        return {
            title: '业余无线电台能力验证 - 考试信息',
            link: 'https://zhipu.allspectrum.cn:9528/CRAC/crac/pages/list_examMsg.html',
            item: items,
        };
    },
};
