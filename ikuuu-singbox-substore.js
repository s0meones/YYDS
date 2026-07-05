// Sub-Store script operation: 用 ikuuu 订阅动态生成官方 sing-box 配置。
// 用法:
//   sing-box.js#type=0&name=ikuuu
// type=0 单条订阅 / type=1(或 col/collection) 组合订阅, name 为该订阅/组合在 Sub-Store 里的"名称"(不是显示名称)。
//
// 私有解析说明:
// ikuuu 订阅 YAML 里带了这一段(仅对 *.v51124-6.qpon 这类 IEPL 专线域名生效):
//   x-client-custom:
//     nameserver-policy:
//       "+.v51124-6.qpon":
//         - "https://<hash>.9fe06a.fyi/dns-query"
//         - "tcp://<hash>.9fe06a.fyi:54#cost-bias=+100ms"
// 这是节点侧的私有 DoH(不是标准 853 DoT),官方 sing-box 不认识 clash 的 nameserver-policy 字段,
// 所以这里改用 sing-box 原生的 outbound.domain_resolver 机制,只对匹配 dot_match 的节点单独指定解析服务器,
// 其余节点(下载专用 .quest / 免费 .art)保持走默认解析(dns-local),不受影响。
// 如果 ikuuu 之后更换了这段私有解析域名或专线分组编号,直接改下面的链接参数即可,不用改脚本:
//   #type=0&name=ikuuu&dot_host=新的hash.9fe06a.fyi&dot_match=\\.新分组\\.qpon$
//
// 自建落地节点链式代理(可选功能):
// 如果在 Sub-Store 里也把自己的自建节点做成了一条订阅/组合, 加上 landing_name 参数即可自动接入:
//   #type=0&name=ikuuu&landing_name=你的落地订阅名称&landing_type=0
// 落地订阅里的节点按名字匹配港/hk、台/tw、美/us(和机场节点用的是同一套地区正则),
// 匹配到的落地节点会被自动加上 detour 指向对应的机场 urltest 分组(HK/TW/US),
// 实现"机场入口(自动测速选优)+ 自建落地"的链式代理, 不需要手动写死任何节点信息。
// 不传 landing_name 就完全不启用这个功能, 跟以前一样。

const args = $arguments || {};
const {
  type = '0',
  name = 'ikuuu',
  dot_host = 'd9eaaedc3c1e59d1dab6bc462a24475df36fd26a.9fe06a.fyi',
  dot_path = '/dns-query',
  dot_port = '443',
  dot_detour = 'DIRECT',
  dot_match = '\\.qpon$',
  landing_name = '',
  landing_type = '0',
} = args;

// 地区匹配正则, 机场分组和落地节点链式代理共用同一套
const REGION_PATTERNS = {
  HK: /港|香港|hk|hong\s*kong/i,
  TW: /台|台湾|臺|tw|taiwan/i,
  SG: /新|狮城|獅城|sg|singapore/i,
  US: /美|美国|美國|us|usa|united\s*states|america/i,
  JP: /日|日本|jp|japan/i,
  DE: /德|德国|德國|de|germany/i,
};
// 落地节点链式代理只对这三个地区生效(跟主人这次的需求范围一致)
const CHAIN_REGIONS = ['HK', 'TW', 'US'];

const config = (ProxyUtils.JSON5 || JSON).parse($content || $files[0]);

const airportProxiesRaw = await produceArtifact({
  type: /^1$|col|collection/i.test(String(type)) ? 'collection' : 'subscription',
  name,
  platform: 'sing-box',
  produceType: 'internal',
});

const dotRegex = dot_host && dot_match ? new RegExp(dot_match, 'i') : null;

const normalizedAirportProxies = sortFreeLast(
  uniqueByTag(airportProxiesRaw)
    .filter((proxy) => proxy && proxy.tag && !/warp|wrap|cloudflare/i.test(proxy.tag))
    .map((proxy) => withPrivateResolver(proxy))
);

let normalizedLandingProxies = [];
if (landing_name) {
  const landingProxiesRaw = await produceArtifact({
    type: /^1$|col|collection/i.test(String(landing_type)) ? 'collection' : 'subscription',
    name: landing_name,
    platform: 'sing-box',
    produceType: 'internal',
  });
  normalizedLandingProxies = uniqueByTag(landingProxiesRaw)
    .filter((proxy) => proxy && proxy.tag)
    .map((proxy) => {
      const region = matchChainRegion(proxy.tag);
      return region ? Object.assign({}, proxy, { detour: region }) : proxy;
    });
}

// 机场节点优先, 落地节点如果 tag 撞车了会被自动去重(保留机场那边的)
const allProxies = uniqueByTag(normalizedAirportProxies.concat(normalizedLandingProxies));

applyPrivateResolver(config);
replaceGeneratedOutbounds(config, allProxies);
fillPolicyGroups(config, normalizedAirportProxies, normalizedLandingProxies);

$content = JSON.stringify(config, null, 2);

function matchChainRegion(tag) {
  for (const region of CHAIN_REGIONS) {
    if (REGION_PATTERNS[region].test(tag)) return region;
  }
  return null;
}

function applyPrivateResolver(config) {
  const servers = config && config.dns && config.dns.servers;
  const rules = config && config.dns && config.dns.rules;

  if (Array.isArray(servers)) {
    const index = servers.findIndex((s) => s && s.tag === 'dns-ikuuu-private');
    if (!dot_host) {
      if (index >= 0) servers.splice(index, 1);
    } else {
      const server = {
        tag: 'dns-ikuuu-private',
        type: 'https',
        detour: dot_detour || 'DIRECT',
        server: dot_host,
        server_port: Number(dot_port) || 443,
        path: dot_path || '/dns-query',
      };
      if (index >= 0) servers[index] = server;
      else servers.push(server);
    }
  }

  if (Array.isArray(rules)) {
    const rIndex = rules.findIndex(
      (r) => r && (r.server === 'dns-ikuuu-private' || r.domain_regex === 'IKUUU_DOT_MATCH_REPLACE_ME')
    );
    if (!dot_host || !dot_match) {
      if (rIndex >= 0) rules.splice(rIndex, 1);
    } else if (rIndex >= 0) {
      rules[rIndex] = { domain_regex: dot_match, server: 'dns-ikuuu-private' };
    }
  }
}

function withPrivateResolver(proxy) {
  const next = Object.assign({}, proxy);
  if (dotRegex && typeof next.server === 'string' && dotRegex.test(next.server)) {
    next.domain_resolver = 'dns-ikuuu-private';
  }
  return next;
}

function replaceGeneratedOutbounds(config, proxies) {
  const policyTags = new Set(['PROXY', 'GLOBAL', 'YOUTUBE', 'AI', 'META', 'EMBY', 'TIKTOK', 'SPEEDTEST', 'HK', 'TW', 'SG', 'US', 'JP', 'DE', 'OTHERS', 'DIRECT']);
  config.outbounds = (config.outbounds || []).filter((outbound) => outbound && policyTags.has(outbound.tag));
  config.outbounds.push(...proxies);
}

function fillPolicyGroups(config, proxies, landingProxies) {
  const all = tags(proxies);
  const allOrDirect = all.length ? all : ['DIRECT'];
  const landingTags = tags(landingProxies || []);
  const hk = tags(proxies, REGION_PATTERNS.HK);
  const tw = tags(proxies, REGION_PATTERNS.TW);
  const sg = tags(proxies, REGION_PATTERNS.SG);
  const us = tags(proxies, REGION_PATTERNS.US);
  const jp = tags(proxies, REGION_PATTERNS.JP);
  const de = tags(proxies, REGION_PATTERNS.DE);
  // 常用分组(HK/TW/SG/US/JP)之外的所有节点,统一进这个分组,方便手动挑选冷门地区节点
  const namedRegex = new RegExp(
    [REGION_PATTERNS.HK, REGION_PATTERNS.TW, REGION_PATTERNS.SG, REGION_PATTERNS.US, REGION_PATTERNS.JP].map((r) => r.source).join('|'),
    'i'
  );
  const others = tags(proxies, undefined).filter((tag) => !namedRegex.test(tag));

  // HK/TW/SG/US/JP 落地节点为空时直接兜底到全部节点(而不是 PROXY),
  // 避免 PROXY 只放分组 tag 之后, 分组和 PROXY 互相引用形成死循环
  const groups = {
    PROXY: ['HK', 'SG', 'JP', 'US', 'TW', 'OTHERS'].concat(landingTags),
    EMBY: ['HK', 'SG', 'JP', 'US', 'TW', 'OTHERS'].concat(landingTags),
    GLOBAL: ['HK', 'SG', 'JP', 'US', 'TW', 'DE', 'OTHERS'].concat(landingTags),
    SPEEDTEST: allOrDirect.concat(landingTags),
    HK: fallback(hk, allOrDirect),
    TW: fallback(tw, allOrDirect),
    SG: fallback(sg, allOrDirect),
    US: fallback(us, allOrDirect),
    JP: fallback(jp, allOrDirect),
    DE: fallback(de, allOrDirect),
    OTHERS: fallback(others, allOrDirect),
    YOUTUBE: ['HK', 'TW', 'SG', 'US', 'JP', 'PROXY'],
    AI: ['TW', 'US', 'SG', 'JP', 'PROXY'],
    META: ['TW', 'US', 'SG', 'JP', 'PROXY'],
    TIKTOK: ['TW', 'SG', 'US', 'JP', 'PROXY'],
  };
  // HK/TW/SG/US/JP 用 urltest 自动测速切换, 其余分组维持手动 selector
  const urltestTags = new Set(['HK', 'TW', 'SG', 'US', 'JP']);

  for (const outbound of config.outbounds || []) {
    if (outbound && Object.prototype.hasOwnProperty.call(groups, outbound.tag)) {
      outbound.type = urltestTags.has(outbound.tag) ? 'urltest' : 'selector';
      outbound.outbounds = groups[outbound.tag];
      outbound.interrupt_exist_connections = true;
    }
  }
}

function tags(proxies, regex) {
  return proxies.filter((proxy) => !regex || regex.test(proxy.tag)).map((proxy) => proxy.tag);
}

function fallback(values, fallbackValues) {
  return values.length ? values : fallbackValues;
}

function uniqueByTag(proxies) {
  const seen = new Set();
  const result = [];
  for (const proxy of proxies || []) {
    if (!proxy || !proxy.tag || seen.has(proxy.tag)) continue;
    seen.add(proxy.tag);
    result.push(proxy);
  }
  return result;
}

function sortFreeLast(proxies) {
  const rest = [];
  const free = [];
  for (const proxy of proxies) {
    if (/免费|free/i.test(proxy.tag)) free.push(proxy);
    else rest.push(proxy);
  }
  return [...rest, ...free];
}
