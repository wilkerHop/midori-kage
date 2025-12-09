global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};
