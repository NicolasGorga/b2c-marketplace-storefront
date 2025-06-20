"use client"

import { Carousel } from "@/components/cells"
import { client } from "@/lib/client"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { ProductCard } from "../ProductCard/ProductCard"

export const AlgoliaProductsCarousel = ({
  locale,
  seller_handle,
  currency_code,
}: {
  locale: string
  seller_handle?: string
  currency_code: string
}) => {
  const filters = `${
    seller_handle
      ? `NOT seller:null AND seller.handle:${seller_handle} AND `
      : "NOT seller:null AND "
  }NOT seller.store_status:SUSPENDED AND supported_countries:${locale} AND variants.prices.currency_code:${currency_code}`

  return (
    <InstantSearchNext searchClient={client} indexName="products">
      <Configure hitsPerPage={4} filters={filters} page={0} />
      <ProductsListing currency_code={currency_code} />
    </InstantSearchNext>
  )
}

const ProductsListing = ({ currency_code }: { currency_code: string }) => {
  const { items } = useHits()

  return (
    <>
      <div className="flex justify-between w-full items-center"></div>
      <div className="w-full ">
        {!items.length ? (
          <div className="text-center w-full my-10">
            <h2 className="uppercase text-primary heading-lg">no results</h2>
            <p className="mt-4 text-lg">
              Sorry, we can&apos;t find any results for your criteria
            </p>
          </div>
        ) : (
          <div className="w-full">
            <Carousel
              align="start"
              items={items.map((hit) => (
                <ProductCard
                  key={hit.objectID}
                  product={hit}
                  currency_code={currency_code}
                />
              ))}
            />
          </div>
        )}
      </div>
    </>
  )
}
