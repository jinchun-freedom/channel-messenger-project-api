/* eslint-disable internal-rules/no-dir-import */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
import { buildSchema } from 'graphql';

// eslint-disable-next-line internal-rules/no-dir-import
import MongoDataBase from '../db';
import { TableName } from '../definition/tableName';

import type {
  Channel,
  ChannelParam,
  ChannelResponse,
} from '../definition/channel';
import type {
  Message,
  MessageParam,
  MessageResponse,
  SerializableMessage,
} from '../definition/message';
import { sleep } from '../utils';
import { OrderBy } from '../definition/order';

export const schema = buildSchema(`
type Channel{
  id:String
  name:String
}
type Message {
  id: String
  channel:String
  title: String
  content: String
  createdAt: String
}
type Query {
  queryMessages: [Message]
}
type Mutation {
  createChannel(name:String): Channel
}
type Subscription {
  writeMessages(channel:String): Message
}
`);

export const roots = {
  query: {
    queryMessages: async (): Promise<Array<MessageResponse> | null> => {
      const channelList: Array<Channel> = await MongoDataBase.getInstance(
        TableName.Channel,
      ).find();
      if (channelList === null || channelList.length === 0) {
        return null;
      }
      const messageData: Array<Message> = await MongoDataBase.getInstance(
        TableName.Message,
      ).find(
        { channel: channelList[0]?._id },
        { field: 'title', order: OrderBy.Desc },
      );
      if (messageData === null || messageData.length === 0) {
        return null;
      }
      const results: Array<MessageResponse> = [];
      messageData.forEach((msg: Message) => {
        results.push({
          id: msg._id,
          title: msg.title,
          content: msg.content,
          channel: msg.channel,
          createdAt: msg.createdAt,
        });
      });
      return results;
    },
  },
  mutation: {
    createChannel: async (input: ChannelParam): Promise<ChannelResponse> => {
      const data: Channel = await MongoDataBase.getInstance(
        TableName.Channel,
      ).upsert(input);
      return {
        id: data._id,
        name: data.name,
      };
    },
  },
  subscription: {
    writeMessages: async function* addMessage(input: MessageParam) {
      for (let i = 0; i < 50; i++) {
        const param: SerializableMessage = {
          channel: input.channel,
          title: `title${i}`,
          content: `content${i}`,
          createdAt: `createdAt${i}`,
        };
        const data: Message = await MongoDataBase.getInstance(
          TableName.Message,
        ).upsert(param);
        await sleep(1000);
        yield {
          writeMessages: {
            id: data._id,
            title: data.title,
            content: data.content,
            channel: data.channel,
            createdAt: data.createdAt,
          },
        };
      }
    },
  },
};

export const rootValue = {
  queryMessages: roots.query.queryMessages,
  createChannel: roots.mutation.createChannel,
  writeMessages: roots.subscription.writeMessages,
};
