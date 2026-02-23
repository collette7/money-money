declare module "ofx-js" {
  interface OFXTransaction {
    TRNTYPE: string;
    DTPOSTED: string;
    TRNAMT: string;
    FITID: string;
    NAME?: string;
    MEMO?: string;
    CHECKNUM?: string;
  }

  interface OFXBankTransactionList {
    DTSTART: string;
    DTEND: string;
    STMTTRN: OFXTransaction | OFXTransaction[];
  }

  interface OFXStatement {
    CURDEF: string;
    BANKACCTFROM?: {
      BANKID: string;
      ACCTID: string;
      ACCTTYPE: string;
    };
    CCACCTFROM?: {
      ACCTID: string;
    };
    BANKTRANLIST?: OFXBankTransactionList;
  }

  interface OFXResponse {
    OFX: {
      SIGNONMSGSRSV1: unknown;
      BANKMSGSRSV1?: {
        STMTTRNRS: {
          STMTRS: OFXStatement;
        };
      };
      CREDITCARDMSGSRSV1?: {
        CCSTMTTRNRS: {
          CCSTMTRS: OFXStatement;
        };
      };
    };
  }

  export function parse(data: string): Promise<OFXResponse>;
}
