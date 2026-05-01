import accnxLogo from '../assets/accnx_network.png';

const ESPN_CDN = 'https://secure.espncdn.com/watchespn/images/channels';

export interface NetworkInfo { url: string; scale?: number; }

const NETWORKS: Record<string, NetworkInfo> = {
  'ESPN':   { url: `${ESPN_CDN}/e748f3c0-3f7c-3088-a90a-0ccb2588e0ed.png`, scale: 0.71 },
  'ESPN2':  { url: `${ESPN_CDN}/017f41a2-ef4f-39d3-9f45-f680b88cd23b.png`, scale: 0.71 },
  'ESPNU':  { url: `${ESPN_CDN}/500b1f7c-dad5-33f9-907c-87427babe201.png`, scale: 0.71 },
  'ACCN':   { url: `${ESPN_CDN}/76b92674-175c-4ff1-8989-380aa514eb87.png`, scale: 0.71 },
  'ACCNX':  { url: accnxLogo, scale: 0.71 },
};

export default NETWORKS;
