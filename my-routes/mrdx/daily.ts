import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import cache from '@/utils/cache';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/daily',
    categories: ['traditional-media'],
    example: '/mrdx/daily',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['mrdx.cn/'],
            target: '/daily',
        },
    ],
    name: '每日电讯',
    maintainers: ['lhteen'],
    handler: async () => {
        const rootUrl = 'http://mrdx.cn/content/PaperIndex.htm';
        
        // 1. 获取当天的真正日期路径
        const paperIndexHtml = await ofetch(rootUrl, { parseResponse: txt => txt });
        const dateMatch = paperIndexHtml.match(/URL=(\d{8})\//);
        
        if (!dateMatch) {
            throw new Error('未能在首页找到最新的日期重定向链接');
        }
        
        const dateStr = dateMatch[1];
        const pubDate = parseDate(dateStr, 'YYYYMMDD');
        const baseUrl = `http://mrdx.cn/content/${dateStr}`;
        const firstPageUrl = `${baseUrl}/Page01BC.htm`;

        // 2. 获取所有的版面（Page）
        const firstPageHtml = await ofetch(firstPageUrl, { parseResponse: txt => txt });
        const $1 = load(firstPageHtml);
        
        const pages = new Set(['Page01BC.htm']);
        $1('a[href^="Page"], a[href^="page"]').each((_, el) => {
            pages.add($1(el).attr('href'));
        });

        // 3. 遍历每个版面，获取所有文章链接
        const list = [];
        for (const page of pages) {
            const pageUrl = `${baseUrl}/${page}`;
            // 获取版面 HTML
            const pageHtml = await ofetch(pageUrl, { parseResponse: txt => txt });
            const $2 = load(pageHtml);
            
            $2('a[daoxiang]').each((_, el) => {
                const title = $2(el).text().trim();
                const id = $2(el).attr('daoxiang');
                if (title && id) {
                    list.push({
                        title: title,
                        link: `${baseUrl}/${id}`,
                        pubDate: pubDate,
                    });
                }
            });
        }

        // 去重，可能同一个文章在页面上出现了多次
        const uniqueLinks = new Set();
        const uniqueList = list.filter(item => {
            if (uniqueLinks.has(item.link)) return false;
            uniqueLinks.add(item.link);
            return true;
        });

        // 4. 获取文章详情内容，并使用 cache 加速
        const items = await Promise.all(
            uniqueList.map((item) =>
                cache.tryGet(item.link, async () => {
                    const articleHtml = await ofetch(item.link, { parseResponse: txt => txt });
                    const $3 = load(articleHtml);

                    // 新华每日电讯的正文很多时候包在特定的 div 或以特殊排版存在
                    // 此处尽量选取内容所在的父容器
                    const contentNode = $3('.main-news, .main-art, div[align=center]').first();
                    
                    if (contentNode.length > 0) {
                        item.description = contentNode.html();
                    } else {
                        // 回退方案：抓取全部文字
                        item.description = $3('body').text();
                    }

                    return item;
                })
            )
        );

        return {
            title: `新华每日电讯`,
            link: `http://mrdx.cn/`,
            item: items,
        };
    },
};
