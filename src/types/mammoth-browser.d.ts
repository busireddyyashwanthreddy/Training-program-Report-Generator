declare module 'mammoth/mammoth.browser' {
  interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  interface MammothBrowser {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
  }

  const mammoth: MammothBrowser;
  export default mammoth;
}
