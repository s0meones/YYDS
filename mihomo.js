// 总开关：true 启用脚本；false 直接返回原配置
const enable = true;

// 「默认节点」名称：漏网之鱼
const DEFAULT_GROUP_NAME = '漏网之鱼';

// 分流规则开关：按需启用对应服务
const ruleOptions = {
  apple: true,
  microsoft: false,
  github: false,
  google: true,
  openai: true,
  spotify: true,
  youtube: true,
  bahamut: false,
  netflix: true,
  tiktok: false,
  disney: false,
  pixiv: false,
  hbo: false,
  'media-cn@!cn': false,
  biliintl: true,
  tvb: false,
  hulu: false,
  primevideo: false,
  telegram: true,
  line: false,
  whatsapp: false,
  games: false,
  japan: false,
  ads: true           // 去广告功能（只规则，不显示策略组）
};

// 规则数组：从空开始，后面只追加真正需要的规则
const rules = [];

// 节点地区识别（自动生成各国家地区策略组）
const regionDefinitions = [
  {
    name: 'HK香港',
    regex: /港|🇭🇰|hk|hongkong|hong kong/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Hong_Kong.png'
  },
  {
    name: 'US美国',
    regex: /(?!.*aus)(?=.*(美|🇺🇸|us(?!t)|usa|american|united states)).*/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/United_States.png'
  },
  {
    name: 'JP日本',
    regex: /日本|🇯🇵|jp|japan/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Japan.png'
  },
  {
    name: 'KR韩国',
    regex: /韩|🇰🇷|kr|korea/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Korea.png'
  },
  {
    name: 'SG新加坡',
    regex: /新加坡|🇸🇬|sg|singapore/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Singapore.png'
  },
  {
    name: 'CN中国大陆',
    regex: /中国|🇨🇳|cn|china/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/China_Map.png'
  },
  {
    name: 'TW台湾',
    regex: /台湾|🇹🇼|tw|taiwan|tai wan/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Taiwan.png'
  },
  {
    name: 'GB英国',
    regex: /英|🇬🇧|uk|united kingdom|great britain/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/United_Kingdom.png'
  },
  {
    name: 'DE德国',
    regex: /德国|🇩🇪|de|germany/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Germany.png'
  },
  {
    name: 'MY马来西亚',
    regex: /马来|🇲🇾|my|malaysia/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Malaysia.png'
  },
  {
    name: 'TK土耳其',
    regex: /土耳其|🇹🇷|tk|turkey/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Turkey.png'
  },
  {
    name: 'CA加拿大',
    regex: /加拿大|🇨🇦|ca|canada/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Canada.png'
  },
  {
    name: 'AU澳大利亚',
    regex: /澳大利亚|🇦🇺|au|australia|sydney/i,
    icon: 'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Australia.png'
  }
];

// 基础配置：
const baseConfig = {
  port: 7890,
  'socks-port': 7891,
  'redir-port': 7892,
  'mixed-port': 7893,
  'tproxy-port': 7894,
  'allow-lan': true,
  'bind-address': '*',
  ipv6: true,
  'unified-delay': true,
  'tcp-concurrent': true,
  'log-level': 'warning',
  'find-process-mode': 'off',
  'global-client-fingerprint': 'chrome',
  'keep-alive-idle': 600,
  'keep-alive-interval': 15,
  'disable-keep-alive': false,
  profile: {
    'store-selected': true,
    'store-fake-ip': true
  },
  'external-controller': '0.0.0.0:9090',
  secret: '',
  'external-ui': '/etc/mihomo/run/ui',
  'external-ui-name': 'zashboard',
  'external-ui-url':
    'https://github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages.zip',
  mode: 'rule'
};

// 嗅探配置
const snifferConfig = {
  enable: true,
  sniff: {
    HTTP: {
      ports: [80, '8080-8880'],
      'override-destination': true
    },
    TLS: { ports: [443, 8443] },
    QUIC: { ports: [443, 8443] }
  },
  'skip-domain': ['Mijia Cloud', '+.push.apple.com']
};

// TUN 配置
const tunConfig = {
  enable: true,
  stack: 'mixed',
  'dns-hijack': ['any:53', 'tcp://any:53'],
  'auto-route': true,
  'auto-redirect': true,
  'auto-detect-interface': true
};

// DNS 配置
const dnsConfig = {
  enable: true,
  listen: '0.0.0.0:1053',
  ipv6: true,
  'respect-rules': true,
  'enhanced-mode': 'fake-ip',
  'fake-ip-range': '28.0.0.1/8',
  'fake-ip-filter-mode': 'blacklist',
  'fake-ip-filter': [
    'rule-set:private_domain,cn_domain',
    '+.services.googleapis.cn',
    '+.xn--ngstr-lra8j.com',
    'time.*.com'
  ],
  'default-nameserver': ['223.5.5.5'],
  'proxy-server-nameserver': ['https://223.5.5.5/dns-query'],
  nameserver: ['223.5.5.5', '119.29.29.29']
};

// rule-provider 通用配置
const ruleProviderCommon = {
  type: 'http',
  interval: 86400
};

// DNS 相关最小 rule-providers（给 fake-ip-filter 用）
const ruleProviders = {
  private_domain: {
    type: 'http',
    interval: 86400,
    behavior: 'domain',
    format: 'mrs',
    url:
      'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs'
  },
  cn_domain: {
    type: 'http',
    interval: 86400,
    behavior: 'domain',
    format: 'mrs',
    url:
      'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs'
  }
};

// 策略组通用配置（全部为 select）
const groupBaseOption = {};

// 各服务策略配置（数量结构按原先 JS）
const serviceConfigs = [
  {
    key: 'openai',
    name: '国外AI',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/ChatGPT.png',
    rules: [
      'GEOSITE,jetbrains-ai,国外AI',
      'GEOSITE,category-ai-!cn,国外AI',
      'GEOSITE,category-ai-chat-!cn,国外AI',
      'DOMAIN-SUFFIX,meta.ai,国外AI',
      'DOMAIN-SUFFIX,meta.com,国外AI'
    ]
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/YouTube.png',
    rules: ['GEOSITE,youtube,YouTube']
  },
  {
    key: 'media-cn@!cn',
    name: '港澳台媒体',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/TVB.png',
    rules: [
      'GEOSITE,tvb,港澳台媒体',
      'GEOSITE,hkt,港澳台媒体',
      'GEOSITE,hkopentv,港澳台媒体',
      'RULE-SET,hk-media,港澳台媒体'
    ],
    provider: {
      key: 'hk-media',
      url: 'https://ruleset.skk.moe/List/non_ip/stream_hk.conf',
      format: 'text',
      behavior: 'classical'
    }
  },
  {
    key: 'biliintl',
    name: '哔哩哔哩东南亚',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/bilibili_3.png',
    rules: ['GEOSITE,biliintl,哔哩哔哩东南亚']
  },
  {
    key: 'bahamut',
    name: '巴哈姆特',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Bahamut.png',
    rules: ['GEOSITE,bahamut,巴哈姆特']
  },
  {
    key: 'disney',
    name: 'Disney+',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Disney+.png',
    rules: ['GEOSITE,disney,Disney+']
  },
  {
    key: 'netflix',
    name: 'NETFLIX',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Netflix.png',
    rules: ['GEOSITE,netflix,NETFLIX']
  },
  {
    key: 'tiktok',
    name: 'Tiktok',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/TikTok.png',
    rules: ['GEOSITE,tiktok,Tiktok']
  },
  {
    key: 'spotify',
    name: 'Spotify',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Spotify.png',
    rules: ['GEOSITE,spotify,Spotify']
  },
  {
    key: 'pixiv',
    name: 'Pixiv',
    icon:
      'https://play-lh.googleusercontent.com/8pFuLOHF62ADcN0ISUAyEueA5G8IF49mX_6Az6pQNtokNVHxIVbS1L2NM62H-k02rLM=w240-h480-rw',
    rules: ['GEOSITE,pixiv,Pixiv']
  },
  {
    key: 'hbo',
    name: 'HBO',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/HBO.png',
    rules: ['GEOSITE,hbo,HBO']
  },
  {
    key: 'tvb',
    name: 'TVB',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/TVB.png',
    rules: ['GEOSITE,tvb,TVB']
  },
  {
    key: 'primevideo',
    name: 'Prime Video',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Prime_Video.png',
    rules: ['GEOSITE,primevideo,Prime Video']
  },
  {
    key: 'hulu',
    name: 'Hulu',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Hulu.png',
    rules: ['GEOSITE,hulu,Hulu']
  },
  {
    key: 'telegram',
    name: 'Telegram',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Telegram.png',
    rules: ['GEOIP,telegram,Telegram']
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon:
      'https://static.whatsapp.net/rsrc.php/v3/yP/r/rYZqPCBaG70.png',
    rules: ['GEOSITE,whatsapp,WhatsApp']
  },
  {
    key: 'line',
    name: 'Line',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Line.png',
    rules: ['GEOSITE,line,Line']
  },
  {
    key: 'games',
    name: '游戏专用',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Game.png',
    rules: [
      // 国内游戏：走 DIRECT（按你“cn 默认直连”的要求）
      'GEOSITE,category-games@cn,DIRECT',
      // 其他地区游戏：走 游戏专用 策略组
      'GEOSITE,category-games,游戏专用'
    ]
  },
  {
    key: 'ads',
    name: '广告过滤',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Advertising.png',
    // 这里直接指向 REJECT，不再用「广告过滤」策略组
    rules: [
      'GEOSITE,category-ads-all,REJECT',
      'RULE-SET,adblockmihomo,REJECT'
    ],
    provider: {
      key: 'adblockmihomo',
      url:
        'https://github.com/217heidai/adblockfilters/raw/refs/heads/main/rules/adblockmihomo.mrs',
      format: 'mrs',
      behavior: 'domain'
    }
  },
  {
    key: 'apple',
    name: '苹果服务',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Apple_2.png',
    rules: ['GEOSITE,apple-cn,苹果服务']
  },
  {
    key: 'google',
    name: '谷歌服务',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Google_Search.png',
    rules: ['GEOSITE,google,谷歌服务']
  },
  {
    key: 'github',
    name: 'Github',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/GitHub.png',
    rules: ['GEOSITE,github,Github']
  },
  {
    key: 'microsoft',
    name: '微软服务',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Microsoft.png',
    rules: [
      'GEOSITE,microsoft@cn,DIRECT',       // 国内微软直连
      'GEOSITE,microsoft,微软服务'          // 其他微软走策略组
    ]
  },
  {
    key: 'japan',
    name: '日本网站',
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Japan.png',
    rules: [
      'RULE-SET,category-bank-jp,日本网站',
      'GEOIP,jp,日本网站,no-resolve'
    ],
    provider: {
      key: 'category-bank-jp',
      url:
        'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-bank-jp.mrs',
      format: 'mrs',
      behavior: 'domain'
    }
  }
];

// “国外站点”的服务，其策略组只允许选各地区组（不含直连 / 漏网之鱼）
const foreignServiceKeys = new Set([
  'openai',
  'youtube',
  'media-cn@!cn',
  'biliintl',
  'bahamut',
  'disney',
  'netflix',
  'tiktok',
  'spotify',
  'pixiv',
  'hbo',
  'tvb',
  'primevideo',
  'hulu',
  'telegram',
  'whatsapp',
  'line',
  'google',
  'github',
  'japan',
  'games'
]);

// 主入口
function main(config) {
  if (!enable) return config;

  // 1. 基础配置
  Object.assign(config, baseConfig);
  config.sniffer = snifferConfig;
  config.tun = tunConfig;
  config.dns = dnsConfig;

  // 2. 节点检查
  const proxies = (config.proxies = config.proxies || []);
  const proxyProviders = config['proxy-providers'];
  const proxyProviderCount =
    proxyProviders && typeof proxyProviders === 'object'
      ? Object.keys(proxyProviders).length
      : 0;

  if (!proxies.length && !proxyProviderCount) {
    throw new Error('配置文件中未找到任何代理');
  }

  // 确保有一个直连节点可用（供少量策略组使用）
  if (!proxies.some(p => p && p.name === '直连')) {
    proxies.push({ name: '直连', type: 'direct', udp: true });
  }

  // 3. 按地区自动分类节点
  const regionGroupsMap = {};
  regionDefinitions.forEach(r => {
    regionGroupsMap[r.name] = [];
  });
  const otherProxies = [];

  for (const p of proxies) {
    if (!p || !p.name) continue;
    if (p.type === 'direct') continue;

    const name = String(p.name);
    let matched = false;

    for (const region of regionDefinitions) {
      if (region.regex.test(name)) {
        regionGroupsMap[region.name].push(name);
        matched = true;
        break;
      }
    }

    if (!matched) otherProxies.push(name);
  }

  // 4. 生成地区策略组（全部为 select）
  const generatedRegionGroups = [];
  for (const def of regionDefinitions) {
    const list = regionGroupsMap[def.name];
    if (list && list.length) {
      generatedRegionGroups.push({
        ...groupBaseOption,
        name: def.name,
        type: 'select',
        icon: def.icon,
        proxies: list
      });
    }
  }
  const regionGroupNames = generatedRegionGroups.map(g => g.name);

  // 未匹配到地区的节点 -> 其他节点
  if (otherProxies.length) {
    generatedRegionGroups.push({
      ...groupBaseOption,
      name: '其他节点',
      type: 'select',
      proxies: otherProxies,
      icon:
        'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/World_Map.png'
    });
  }

  // 5. 功能策略组
  const functionalGroups = [];

  // 5.1 漏网之鱼：不含直连，只包含地区组 + 其他节点
  functionalGroups.push({
    ...groupBaseOption,
    name: DEFAULT_GROUP_NAME,
    type: 'select',
    proxies: [
      ...regionGroupNames,
      ...(otherProxies.length ? ['其他节点'] : [])
    ],
    icon:
      'https://raw.githubusercontent.com/s0meones/YYDS/main/Icon/Final.png'
  });

  // 5.2 各服务策略组 + 规则 / rule-providers
  for (const svc of serviceConfigs) {
    if (!ruleOptions[svc.key]) continue;

    // 追加该服务对应规则
    rules.push(...svc.rules);

    // 追加该服务需要的 rule-provider（如果有）
    if (svc.provider) {
      ruleProviders[svc.provider.key] = {
        ...ruleProviderCommon,
        behavior: svc.provider.behavior,
        format: svc.provider.format,
        url: svc.provider.url
      };
    }

    // 广告过滤：只用规则 REJECT，不建策略组（面板不显示）
    if (svc.key === 'ads') continue;

    // 决定该服务策略组可选出站
    let groupProxies;
    if (foreignServiceKeys.has(svc.key)) {
      // 国外网站：只允许地区组
      groupProxies = [...regionGroupNames];

      // 国外 AI（OpenAI）里去掉香港
      if (svc.key === 'openai') {
        groupProxies = groupProxies.filter(
          name => !/HK|香港/.test(name)
        );
      }
    } else {
      // 其他服务：允许 漏网之鱼 + 地区组 + 直连
      groupProxies = [DEFAULT_GROUP_NAME, ...regionGroupNames, '直连'];
    }

    functionalGroups.push({
      ...groupBaseOption,
      name: svc.name,
      type: 'select',
      proxies: groupProxies,
      icon: svc.icon
    });
  }

  // 6. 自定义规则区（你想单独指定的走向都写在这里）
  rules.push(
    // - 1password.com 走 漏网之鱼
    `DOMAIN-SUFFIX,1password.com,${DEFAULT_GROUP_NAME}`,
    // - kuxueyun.com 直连
    'DOMAIN-SUFFIX,kuxueyun.com,DIRECT'
  );

  // 7. 兜底规则：
  // - 私网直连
  // - cn 国内网站：全部 DIRECT
  // - cn 以外（geolocation-!cn）：全部走 漏网之鱼
  // - 其他未命中：MATCH -> 漏网之鱼
  rules.push(
    'GEOSITE,private,DIRECT',
    'GEOIP,private,DIRECT,no-resolve',
    'GEOSITE,cn,DIRECT',
    'GEOIP,cn,DIRECT,no-resolve',
    `GEOSITE,geolocation-!cn,${DEFAULT_GROUP_NAME}`,
    `MATCH,${DEFAULT_GROUP_NAME}`
  );

  // 8. 写回配置
  config['proxy-groups'] = [...functionalGroups, ...generatedRegionGroups];
  config.rules = rules;
  config['rule-providers'] = ruleProviders;

  return config;
}
