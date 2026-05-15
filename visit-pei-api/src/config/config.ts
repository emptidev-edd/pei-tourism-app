export const config = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  pei511Key: process.env.PEI511_KEY ?? '',
  vicListUrl:
    process.env.VIC_LIST_URL ??
    'https://www.tourismpei.com/about-pei/visitor-information-centres',
  runIngestOnBoot: (process.env.RUN_INGEST_ON_BOOT ?? 'false') === 'true',
};
