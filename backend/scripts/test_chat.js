import mongoose from 'mongoose';
import { ChatService } from '../src/domains/chat/chat.service.js';
import { User } from '../src/models/User.js';

async function testChat() {
  await mongoose.connect('mongodb://localhost:27017/hpmbs_db');

  const user = await User.findOne({ email: 'test@gmail.com' });
  console.log('Testing Chat for user:', user?.name, user?.role, user?.hospitalId);

  // 1. Test roster and channels
  const roster = await ChatService.getStaffRosterAndChannels(user);
  console.log('Channels found:', roster.channels.map(c => ({ id: c.id, name: c.name, unread: c.unreadCount })));
  console.log('Contacts found:', roster.contacts.length, 'Online count:', roster.onlineCount);

  // 2. Test send message to General channel
  const sentChannelMsg = await ChatService.sendMessage(
    {
      channel: 'GENERAL',
      message: 'Hello team! Real-time staff chat system is now active.',
    },
    user
  );
  console.log('Sent Channel Msg:', sentChannelMsg._id, sentChannelMsg.message);

  // 3. Test get channel messages
  const messages = await ChatService.getMessages({ channel: 'GENERAL' }, user);
  console.log('Fetched Channel Messages:', messages.length, messages.map(m => ({ text: m.message, sender: m.senderName })));

  await mongoose.disconnect();
}

testChat().catch(console.error);
