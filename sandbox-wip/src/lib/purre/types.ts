export type Media = { type: "image" | "video"; url: string };

export type Profile = {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  city: string;
  avatar: string | null;
  cover: string | null;
  accountType: "user" | "breeder";
  role: "user" | "moderator" | "admin";
  kennelName: string;
  verifiedBreeder: boolean;
  premium: boolean;
  premiumUntil: string | null;
  bannedUntil: string | null;
  warningCount: number;
  walletCoins: number;
  email: string | null;
  followers: number;
  following: number;
  postCount: number;
};

export type Post = {
  id: string;
  userId: string;
  kind: "post" | "reel";
  body: string;
  media: Media[];
  audioId: string | null;
  hidden: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  handle: string;
  displayName: string;
  avatar: string | null;
  verifiedBreeder: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  handle: string;
  displayName: string;
  avatar: string | null;
};

export type Listing = {
  id: string;
  userId: string;
  title: string;
  species: string;
  breed: string;
  pricePln: number;
  city: string;
  body: string;
  media: Media[];
  hidden: boolean;
  createdAt: string;
  handle: string;
  displayName: string;
  avatar: string | null;
  verifiedBreeder: boolean;
};

export type Group = {
  id: string;
  slug: string;
  ownerId: string;
  name: string;
  about: string;
  cover: string | null;
  memberCount: number;
  createdAt: string;
};

export type GroupPost = {
  id: string;
  groupId: string;
  userId: string;
  body: string;
  media: Media[];
  createdAt: string;
  handle: string;
  displayName: string;
  avatar: string | null;
};

export type Ad = {
  id: string;
  sponsor: string;
  title: string;
  body: string;
  href: string;
  image: string | null;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  bpm: number;
};

export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type Me = {
  profile: Profile;
  likedIds: string[];
  followingIds: string[];
  groupIds: string[];
  unread: number;
  publicKey: string | null;
};
