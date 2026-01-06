import cleanRules from './clean-rules.js';
import cleanFactory from './clean-factory.js';

/**
 * @param {URL | String} url
 * @param {Boolean} [verbose]
 * @param {{skipBv2av?: Boolean}} [options]
 * @returns {Promise<URL>}
 */
export const cleanLink = async (url, verbose = false, options = {}) => {
    let urlProcess = new URL(url);
    /** @type {import('./clean-rules.js').cleanRule} */
    let rule;
    while (rule = cleanRules.find(e => {
        // 如果设置了跳过 BV 转 AV，则跳过该规则
        if (options.skipBv2av && e.name === 'Bilibili video (bv2av)') return false;
        return e.match(urlProcess);
    })) {
        const urlBefore = urlProcess.toString();
        urlProcess = (await rule.clean(urlProcess)) || urlProcess;
        if (verbose) console.log(urlProcess.toString(), `(Clean rule: ${rule.name})`);
        if (urlBefore === urlProcess.toString()) break;
    }
    return urlProcess;
};

/**
 * @param {URL | String} url
 * @returns {Promise<String>}
 */
export const getTitle = async url => {
    let fetchUrl = new URL(url);
    // B站对 BV 格式 URL 的直接请求可能返回 412，先转成 AV 格式
    if ((fetchUrl.hostname === 'www.bilibili.com' || fetchUrl.hostname === 'm.bilibili.com') 
        && /^\/video\/[Bb][Vv][A-HJ-NP-Za-km-z1-9]{10}\/?$/.test(fetchUrl.pathname)) {
        fetchUrl = cleanFactory.bv2av(fetchUrl);
    }
    const body = await fetch(fetchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
        },
    }).then(r => {
        if (r.status >= 400) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
    });
    let title = body.match(/<title(?: .+?)?>(.+?)<\/title>/)[1].trim()
    for (const [entity, decoded] of [
        ['&amp;', '&'],
        ['&gt;', '>'],
        ['&lt;', '<'],
        ['&nbsp;', ' '],
        ['&quot;', '"'],
        ['&yen;', '¥'],
    ]) {
        title = title.replaceAll(entity, decoded);
    }
    title = title.replace(/&#(\d+);/g, (_, m) => String.fromCharCode(parseInt(m)));
    title = title.replace(/&#x([\da-f]+);/g, (_, m) => String.fromCharCode(parseInt(m, 16)));
    return title;
};

export default cleanLink;
