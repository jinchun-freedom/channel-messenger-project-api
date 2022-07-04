import type { mongoType } from '.';

export type MessageParam = {
  channel: string;

};

export type SerializableMessage = {
  title: string;
  content: string;
  createdAt: string;
} & MessageParam;

export type MessageResponse = {
  id: string;
  title: string;
  content: string;
  channel: string;
  createdAt: string;
};

export type Message = MessageResponse & mongoType;
