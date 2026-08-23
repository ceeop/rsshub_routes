import { load } from 'cheerio';
import type { Context } from 'hono';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

type ListItem = DataItem & { link: string };

const ossUrl = 'https://oss.aisixiang.com';
const rootUrl = 'https://www.aisixiang.com';

export const route: Route = {
    path: ['/ranking/:id?/:period?', '/toplist/:id?/:period?'],
    categories: ['reading'],
    example: '/aisixiang/toplist/10',
    parameters: {
        id: '排行类型，见下表，默认为文章点击排行',
        period: '统计周期，仅用于文章点击排行，默认为 1',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
    },
    radar: [
        {
            source: ['www.aisixiang.com/toplist/'],
            target: '/toplist/10',
        },
    ],
    name: '文章排行',
    maintainers: ['HenryQW', 'nczitzk'],
    handler,
    description: `| 文章点击排行 | 最近更新文章 | 文章推荐排行 |
| ------------ | ------------ | ------------ |
| 1            | 10           | 11           |`,
};

async function handler(ctx: Context) {
    const { id = '1', period = '1' } = ctx.req.param();
    const limit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const currentUrl = new URL(`toplist?id=${id}${id === '1' ? `&period=${period}` : ''}`, rootUrl).href;

    const response = await ofetch<string>(currentUrl, { parseResponse: (text) => text });
    const $ = load(response);
    const title = $('title').text().split('_')[0] || '文章排行';

    const list = $('div.tops_list')
        .slice(0, limit)
        .toArray()
        .flatMap((element): ListItem[] => {
            const row = $(element);
            const anchor = row.find('div.tips a').first();
            const href = anchor.attr('href');

            if (!href) {
                return [];
            }

            const authors = row
                .find('div.name a')
                .toArray()
                .map((author) => $(author).text().trim())
                .filter(Boolean);
            const category = row.find('div.ablum_list a').first().text().trim();
            const date = row.find('div.times').text().trim();

            return [
                {
                    title: anchor.text(),
                    link: new URL(href, rootUrl).href,
                    author: authors.join('、'),
                    category: category ? [category] : undefined,
                    pubDate: date ? timezone(parseDate(date, 'YYYY-MM-DD'), +8) : undefined,
                },
            ];
        });

    const items = await Promise.all(list.map((item) => getArticle(item)));

    return {
        title: `爱思想 - ${title}`,
        link: currentUrl,
        language: 'zh-CN' as const,
        image: new URL('images/logo_toplist.jpg', ossUrl).href,
        item: items,
    };
}

function getArticle(item: ListItem): Promise<DataItem> {
    return cache.tryGet<DataItem>(item.link, async () => {
        const response = await ofetch<string>(item.link, { parseResponse: (text) => text });
        const $ = load(response);
        const articleContent = $('div.article-content').first();
        const content = articleContent.length ? articleContent : $('div#content').first();

        if (!content.length || !content.html()?.trim()) {
            throw new Error(`未能解析爱思想文章正文：${item.link}`);
        }

        content.find('[src]').each((_, element) => {
            const source = $(element).attr('src');
            if (source) {
                $(element).attr('src', new URL(source, item.link).href);
            }
        });
        content.find('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                $(element).attr('href', new URL(href, item.link).href);
            }
        });

        const metadata = $('.about > div').first();
        const authors = metadata
            .find('strong')
            .toArray()
            .map((author) => $(author).text().trim())
            .filter(Boolean);
        const keywords = metadata
            .find('p[align="right"] u')
            .toArray()
            .map((keyword) => $(keyword).text().trim())
            .filter(Boolean);
        const categories = [...new Set([...(item.category ?? []), ...keywords])];
        const date = /更新时间：\s*([\d-]+\s+[\d:]+)/.exec($('div.info').first().text())?.[1];

        return {
            ...item,
            description: content.html() ?? undefined,
            author: authors.length > 0 ? authors.join('、') : item.author,
            category: categories.length > 0 ? categories : undefined,
            pubDate: date ? timezone(parseDate(date, 'YYYY-MM-DD HH:mm'), +8) : item.pubDate,
        };
    });
}
