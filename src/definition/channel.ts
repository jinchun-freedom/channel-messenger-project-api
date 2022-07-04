import type { mongoType } from '.';

export type ChannelParam = {
  name: string;
};

export type ChannelResponse = {
  id: string;
  name: string;
};

export type Channel = ChannelResponse & mongoType;
