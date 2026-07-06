// Sub-Store script operation: 用订阅动态生成 sing-box 配置(通用模板, 不绑定具体机场)。
// 用法:
//   sing-box.js#type=0&name=ikuuu
// type=0 单条订阅 / type=1(或 col/collection) 组合订阅, name 为该订阅/组合在 Sub-Store 里的"名称"(不是显示名称)。
// 换成别的机场只需要把 name 换成对应订阅的名称, 脚本本身不写死任何机场专属逻辑。
//
// 自建落地节点链式代理(可选功能):
// 如果在 Sub-Store 里也把自己的自建节点做成了一条订阅/组合, 加上 landing_name 参数即可自动接入:
//   #type=0&name=ikuuu&landing_name=你的落地订阅名称&landing_type=0
// 落地订阅里的节点按名字匹配港/hk、台/tw、新/sg、美/us、日/jp,
// 匹配到的落地节点会被自动加上 detour 指向对应的机场 urltest 分组(HK/TW/SG/US/JP),
// 实现"机场入口(自动测速选优)+ 自建落地"的链式代理, 不需要手动写死任何节点信息。
// 不传 landing_name 就完全不启用这个功能。
//
// 私有 DNS 解析(可选功能, 通用, 不写死具体机场):
// 有些机场的节点域名是编码过的(比如走三网 BGP 多线入口), 只有走它自己指定的私有解析
// 才能解析到正确的入口 IP, 走公共 DNS 可能解析错、或者只解析到单一线路导致某些运营商不适配。
// 用法(dot_host/dot_match 都要传, 具体值找机场自己的说明文档/订阅里的 nameserver-policy 之类的字段):
//   #type=0&name=ikuuu&dot_host=私有解析域名&dot_match=\.节点域名后缀$
// 可选参数:
//   dot_type: 'https'(默认, DoH, 443端口) 或 'tcp'(纯文本 DNS over TCP, 不走 TLS 握手)。
//     校园网/公司网这类会对 443 端口做 SSL 中间人检测的环境, DoH 可能直接被拦截报证书错误,
//     这种情况换成 dot_type=tcp(端口按机场给的改, 比如 ikuuu 是 54)通常能绕开, 因为没有 TLS 握手可拦。
//   dot_path: DoH 模式下的路径, 默认 /dns-query, tcp 模式下无效。
//   dot_port: 默认 443(https 模式)/53(tcp 模式), 具体看机场给的端口。
//   dot_detour: 默认 DIRECT, 一般不要改, 否则可能出现"连代理要先解析域名, 解析域名又要先连代理"的死循环。
// dot_host、dot_match 两个都不传就完全不启用, 模板对任何机场都保持通用。

const args = $arguments || {};
const {
  type = '0',
  name = 'ikuuu',
  landing_name = '',
  landing_type = '0',
  dot_host = '',
  dot_type = 'https',
  dot_path = '/dns-query',
  dot_port = '',
  dot_detour = 'DIRECT',
  dot_match = '',
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
// 落地节点链式代理支持的地区 = 机场那五个 urltest 入口分组, 不写死具体是哪几个地区,
// 落地订阅里以后加了新地区的节点(比如 SG/JP), 会自动识别、自动生成对应的链式分组, 不用改脚本
const CHAIN_REGIONS = ['HK', 'TW', 'SG', 'US', 'JP'];

// 这些 tag 是脚本自己要用的分组名, 订阅里如果凑巧有节点也叫这些名字(尤其 HK/TW/SG/US/JP 这种两三个字母的),
// 会跟分组本身撞 tag, 导致分组被节点"顶掉"(sing-box/客户端按 tag 去重时以后出现的为准), 表现为分组整个消失。
// 撞了就自动改名, 避免这个坑。
const RESERVED_TAGS = new Set(['PROXY', 'GLOBAL', 'YOUTUBE', 'AI', 'META', 'EMBY', 'TIKTOK', 'SPEEDTEST', 'HK', 'TW', 'SG', 'US', 'JP', 'DE', 'OTHERS', 'DIRECT']);
function avoidReservedTag(proxy) {
  if (!proxy || !RESERVED_TAGS.has(proxy.tag)) return proxy;
  return Object.assign({}, proxy, { tag: proxy.tag + ' (节点)' });
}

// 私有解析只在 dot_host 和 dot_match 都传了的时候才生效
const dotRegex = dot_host && dot_match ? new RegExp(dot_match, 'i') : null;

const config = (ProxyUtils.JSON5 || JSON).parse($content || $files[0]);

const airportProxiesRaw = await produceArtifact({
  type: /^1$|col|collection/i.test(String(type)) ? 'collection' : 'subscription',
  name,
  platform: 'sing-box',
  produceType: 'internal',
});

const normalizedAirportProxies = sortFreeLast(
  uniqueByTag(airportProxiesRaw)
    .filter((proxy) => proxy && proxy.tag && !/warp|wrap|cloudflare/i.test(proxy.tag))
    .map(avoidReservedTag)
    .map(withPrivateResolver)
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
    .map(avoidReservedTag)
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
    const index = servers.findIndex((s) => s && s.tag === 'dns-private');
    if (!dot_host) {
      if (index >= 0) servers.splice(index, 1);
    } else {
      const isTcp = String(dot_type).toLowerCase() === 'tcp';
      const server = isTcp
        ? {
            tag: 'dns-private',
            type: 'tcp',
            detour: dot_detour || 'DIRECT',
            server: dot_host,
            server_port: Number(dot_port) || 53,
          }
        : {
            tag: 'dns-private',
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
      (r) => r && (r.server === 'dns-private' || r.domain_regex === 'PRIVATE_DOT_MATCH_REPLACE_ME')
    );
    if (!dot_host || !dot_match) {
      if (rIndex >= 0) rules.splice(rIndex, 1);
    } else if (rIndex >= 0) {
      rules[rIndex] = { domain_regex: dot_match, server: 'dns-private' };
    }
  }
}

function withPrivateResolver(proxy) {
  if (!dotRegex || !proxy || typeof proxy.server !== 'string' || !dotRegex.test(proxy.server)) return proxy;
  return Object.assign({}, proxy, { domain_resolver: 'dns-private' });
}

function replaceGeneratedOutbounds(config, proxies) {
  const policyTags = new Set(['PROXY', 'GLOBAL', 'YOUTUBE', 'AI', 'META', 'EMBY', 'TIKTOK', 'SPEEDTEST', 'HK', 'TW', 'SG', 'US', 'JP', 'DE', 'OTHERS', 'DIRECT']);
  config.outbounds = (config.outbounds || []).filter((outbound) => outbound && policyTags.has(outbound.tag));
  config.outbounds.push(...proxies);
}

function fillPolicyGroups(config, proxies, landingProxies) {
  const all = tags(proxies);
  const allOrDirect = all.length ? all : ['DIRECT'];

  // 链式代理不再套一层"<地区>-RELAY"分组, 改成直接把套了链式的落地节点(leaf 节点, 自己带 detour)
  // 摆进策略组里, 少一层"分组套分组"的嵌套。节点本身的 detour 字段还是指向机场入口分组不变。
  const chainTagsByRegion = {};
  for (const region of CHAIN_REGIONS) {
    const chainTags = tags((landingProxies || []).filter((proxy) => proxy.detour === region));
    if (chainTags.length) chainTagsByRegion[region] = chainTags;
  }

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

  // 只要某个地区有链式落地节点, 所有引用该地区的策略组都直接把这个地区的原始 tag 换成
  // 落地节点自己的 tag(可能不止一个), 不再同时显示"原始机场分组"和"链式节点"两个重复选项。
  // 没有链式节点的地区不受影响, 还是引用原始机场分组(不会出现空分组)。
  const regionOrChainNodes = (region) => chainTagsByRegion[region] || [region];

  // HK/TW/SG/US/JP 落地节点为空时直接兜底到全部节点(而不是 PROXY),
  // 避免 PROXY 只放分组 tag 之后, 分组和 PROXY 互相引用形成死循环
  // GLOBAL 是"全局模式"专用的兜底选择, 干脆放全部单个节点(机场+落地), 不嵌套任何子分组,
  // 这样每一个选项在客户端里都能被单独测速, 不会碰到"子策略组测不出延迟"的问题
  const allIndividualTags = all.concat(tags(landingProxies || []));

  const groups = {
    PROXY: ['HK', 'SG', 'JP', 'US', 'TW'].flatMap(regionOrChainNodes),
    EMBY: ['HK', 'SG', 'JP', 'US', 'TW'].flatMap(regionOrChainNodes),
    GLOBAL: allIndividualTags.length ? allIndividualTags : ['DIRECT'],
    SPEEDTEST: ['HK', 'SG', 'JP', 'US', 'TW'].flatMap(regionOrChainNodes),
    HK: fallback(hk, allOrDirect),
    TW: fallback(tw, allOrDirect),
    SG: fallback(sg, allOrDirect),
    US: fallback(us, allOrDirect),
    JP: fallback(jp, allOrDirect),
    DE: fallback(de, allOrDirect),
    OTHERS: fallback(others, allOrDirect),
    YOUTUBE: ['HK', 'TW', 'SG', 'US', 'JP'].flatMap(regionOrChainNodes),
    AI: ['TW', 'US', 'SG', 'JP'].flatMap(regionOrChainNodes),
    META: ['TW', 'US', 'SG', 'JP'].flatMap(regionOrChainNodes),
    TIKTOK: ['TW', 'SG', 'US', 'JP'].flatMap(regionOrChainNodes),
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
