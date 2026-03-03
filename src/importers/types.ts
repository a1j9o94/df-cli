/**
 * Contract: IssueData Interface (ctr_01KJSSJ7TEWR68G47QNVPXR8CJ)
 * Contract: IssueImporter Interface (ctr_01KJSSJ7TEN1XPE5EX1FAS71F8)
 *
 * These types are defined by mod-a. This file exists so mod-b can compile
 * against the contracts independently. At integration time, mod-a's version
 * is authoritative.
 */

export interface Comment {
  author: string;
  date: string;
  body: string;
  isBot: boolean;
}

export interface IssueData {
  title: string;
  body: string;
  labels: string[];
  comments: Comment[];
  sourceUrl: string;
}

export interface IssueImporter {
  canHandle(url: string): boolean;
  fetch(url: string): Promise<IssueData>;
}
