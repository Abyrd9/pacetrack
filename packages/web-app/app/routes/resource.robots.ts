import { getDomainUrl } from "~/utils/helpers/domain-url";
import type { Route } from "./+types/resource.robots";

// A robots.txt file tells search engine crawlers which URLs the crawler can access on your site.
export async function loader({ request }: Route.LoaderArgs) {
  const url = getDomainUrl(request);

  // handle "GET" request
  // set up our text content that will be returned in the response
  const robotText = `
        User-agent: Googlebot
        Disallow: /nogooglebot/
    
        User-agent: *
        Allow: /
    
        Sitemap: ${url}/sitemap.xml
        `;
  // return the text content, a status 200 success response, and set the content type to text/plain
  return new Response(robotText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
