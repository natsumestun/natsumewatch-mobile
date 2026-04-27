import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = {
  Home: undefined;
  Catalog: { ongoing?: boolean; query?: string } | undefined;
  Random: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Anime: {
    idOrAlias: string;
    initialEpisode?: number;
    initialProvider?: string;
    initialStudio?: string;
  };
  Player: {
    title: string;
    hls: string;
    initialPosition?: number;
    releaseId?: number;
    episodeOrdinal?: number;
    episodeName?: string | null;
    sourceProvider?: string | null;
    sourceStudio?: string | null;
  };
  KodikPlayer: {
    title: string;
    iframeUrl: string;
    releaseId?: number;
    episodeOrdinal?: number;
    episodeName?: string | null;
    sourceProvider?: string | null;
    sourceStudio?: string | null;
  };
  Filters: undefined;
  Search: undefined;
  Login: undefined;
  Register: undefined;
  MyList: { status: import("../api/types").ListStatus };
  History: undefined;
  Stats: undefined;
  Friends: undefined;
  Chat: { userId: number; username: string };
  Torrents: { idOrAlias: string; title?: string };
  Comments: { releaseId: number; title?: string };
  Reviews: { releaseId: number; title?: string };
};
