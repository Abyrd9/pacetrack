import { getDomainUrl } from "~/utils/helpers/domain-url";
import type { Route } from "./+types/resource.sitemap";

export async function loader({ request }: Route.LoaderArgs) {
  const url = getDomainUrl(request);

  let content = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  content += `
    <url>
      <loc>${url}/whatever-location</loc>
      <lastmod>01/16/1992</lastmod> // this is the last time the page was modified
      <priority>1.0</priority>
    </url>`;

  // We can also use the database to generate the sitemap, this is an example
  // const searches = await db.query.documents.findMany();
  // if (searches) {
  //   searches.forEach((search) => {
  //     content += `
  //     <url>
  //       <loc>${url}/${search.search}</loc>
  //       <lastmod>${search.created_at}</lastmod>
  //       <priority>1.0</priority>
  //     </url>`;
  //   });
  // }

  content += "</urlset>";

  return new Response(content, {
    headers: {
      "content-type": "application/xml",
      "xml-version": "1.0",
      encoding: "UTF-8",
    },
  });
}
