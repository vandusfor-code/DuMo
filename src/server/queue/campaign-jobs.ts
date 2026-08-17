import "server-only";

export type CampaignJobData = {
  campaignId: string;
};

export const CAMPAIGN_QUEUE_NAME = "campaign-send";
