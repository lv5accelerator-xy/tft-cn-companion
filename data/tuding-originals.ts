export type OriginalGuideImage = {
  url: string;
  articleUrl: string;
  patch: string;
  publishedAt: string;
  width: number;
  height: number;
};

// Visually checked titles and patch labels against the publisher's originals.
// Keep separate from generated records so feed refreshes preserve these links.
export const tudingOriginals: Record<string, OriginalGuideImage> = {
  "tuding-182-nidalee-aphelios": {
    "url": "https://inews.gtimg.com/om_bt/OGiFKqJJLz2dSCLNz2qKFFc87h_kDiLa2tYpHGe_pmwUwAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1049,
    "height": 784
  },
  "tuding-182-draven-fast9": {
    "url": "https://inews.gtimg.com/om_bt/OH9UGc4WRnhWvDzl8L2bzYP7JahhJxhWYbzdjhBnofiwEAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1052,
    "height": 784
  },
  "tuding-182-primal-double-carry": {
    "url": "https://inews.gtimg.com/om_bt/OOnqnNu8VyTsDzESIGGx-MEVrNw9Ng_Z3DNAzt7OCEXk4AA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1053,
    "height": 789
  },
  "tuding-182-invoker-ahri": {
    "url": "https://inews.gtimg.com/om_bt/OCSHnkWJNFdxQa6bMDuY_d-tg3aPYJcRDPm2H_Pf0PA8UAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1050,
    "height": 787
  },
  "tuding-182-rift-blue-reroll": {
    "url": "https://inews.gtimg.com/om_bt/OAfxk9-ellUN7MWRr9-0sg7DOobrm-JECAF7NP9Qvo6OsAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1051,
    "height": 786
  },
  "tuding-182-primal-lotus": {
    "url": "https://inews.gtimg.com/om_bt/OtjKZSdUt0tKYUA4BP6N1XjrhJ6927Y3pSbaoHrla09CsAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260910A0BLQA00",
    "patch": "18.2",
    "publishedAt": "2026-09-10",
    "width": 1052,
    "height": 786
  },
  "tuding-182-dragon-fast9": {
    "url": "https://inews.gtimg.com/om_bt/OxokTwnwYaFMbMfXFxFm34fsB4e_QCWxERdapw8XVjEFIAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260911A0G6IS00",
    "patch": "18.2",
    "publishedAt": "2026-09-11",
    "width": 1055,
    "height": 791
  },
  "tuding-182-thorn-soraka": {
    "url": "https://inews.gtimg.com/om_bt/OQvNesRq2v0O5J_EHRi8R2oz0VUjS28agCCIS1DhNT3U8AA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260911A0G6IS00",
    "patch": "18.2",
    "publishedAt": "2026-09-11",
    "width": 1055,
    "height": 791
  },
  "tuding-182-baby-akali": {
    "url": "https://inews.gtimg.com/om_bt/OfPXc83as9wOGYHTps95otZzFXDkgIwrjHGSf5ahZkzlwAA/0",
    "articleUrl": "https://news.qq.com/rain/a/20260911A0G6IS00",
    "patch": "18.2",
    "publishedAt": "2026-09-11",
    "width": 1055,
    "height": 791
  }
};
