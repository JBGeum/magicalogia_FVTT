// Minimal Foundry mock for test environment
class ApplicationV2 {}

function HandlebarsApplicationMixin(Base) {
  return class extends Base {};
}

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2,
      HandlebarsApplicationMixin,
    },
  },
};
