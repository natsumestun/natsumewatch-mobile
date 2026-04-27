import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = {
  Home: undefined;
  Catalog: { ongoing?: boolean; query?: string } | undefined;
  Random: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Anime: { idOrAlias: string };
  Player: {
    title: string;
    hls: string;
    initialPosition?: number;
  };
  KodikPlayer: {
    title: string;
    iframeUrl: string;
  };
  Filters: undefined;
  Search: undefined;
  Login: undefined;
  Register: undefined;
  MyList: { status: import("../api/types").ListStatus };
};
