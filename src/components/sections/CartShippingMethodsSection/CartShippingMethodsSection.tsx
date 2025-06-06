"use client"

import ErrorMessage from "@/components/molecules/ErrorMessage/ErrorMessage"
import { setShippingMethod } from "@/lib/data/cart"
import { calculatePriceForShippingOption } from "@/lib/data/fulfillment"
import { convertToLocale } from "@/lib/helpers/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, clx } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { RadioGroup, Radio } from "@headlessui/react"
import { Button } from "@/components/atoms"

type StoreCardShippingMethod = HttpTypes.StoreCartShippingOption & {
  seller_id?: string
  service_zone?: {
    fulfillment_set: {
      type: string
    }
  }
}

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: StoreCardShippingMethod[] | null
}

const CartShippingMethodsSection: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
  )

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }
  }, [availableShippingMethods])

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (id: string | null) => {
    setError(null)

    let currentId: string | null = null
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id! }).catch(
      (err) => {
        setShippingMethodId(currentId)

        setError(err.message)
      }
    )
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const groupedBySellerId = _shippingMethods?.reduce((acc: any, method) => {
    const sellerId = method.seller_id!

    if (!acc[sellerId]) {
      acc[sellerId] = []
    }

    acc[sellerId].push(method)
    return acc
  }, {})

  return (
    <div className="border p-4 rounded-sm bg-ui-bg-interactive">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline items-center"
        >
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
          Delivery
        </Heading>
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => handleSetShippingMethod(v)}
                >
                  {Object.keys(groupedBySellerId).map((key) => {
                    return (
                      <div key={key}>
                        <Heading level="h3" className="mb-2">
                          {groupedBySellerId[key][0].seller_name}
                        </Heading>
                        {groupedBySellerId[key].map((option: any) => {
                          const isDisabled =
                            option.price_type === "calculated" &&
                            !isLoadingPrices &&
                            typeof calculatedPricesMap[option.id] !== "number"

                          return (
                            <Radio
                              key={option.id}
                              value={option.id}
                              data-testid="delivery-option-radio"
                              disabled={isDisabled}
                              className={clx(
                                "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-md px-4 mb-2 hover:border-secondary",
                                {
                                  "border-ui-border-interactive":
                                    option.id === shippingMethodId,
                                  "hover:shadow-brders-none cursor-not-allowed":
                                    isDisabled,
                                }
                              )}
                            >
                              <div className="flex items-center gap-x-4">
                                <span className="text-base-regular">
                                  {option.name}
                                </span>
                              </div>
                              <span className="justify-self-end text-ui-fg-base">
                                {option.price_type === "flat" ? (
                                  convertToLocale({
                                    amount: option.amount!,
                                    currency_code: cart?.currency_code,
                                  })
                                ) : calculatedPricesMap[option.id] ? (
                                  convertToLocale({
                                    amount: calculatedPricesMap[option.id],
                                    currency_code: cart?.currency_code,
                                  })
                                ) : isLoadingPrices ? (
                                  <Loader />
                                ) : (
                                  "-"
                                )}
                              </span>
                            </Radio>
                          )
                        })}
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              onClick={handleSubmit}
              variant="tonal"
              disabled={!cart.shipping_methods?.[0]}
              // loading={isLoadingPrices}
            >
              Continue to payment
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col">
                {cart.shipping_methods?.map((method) => (
                  <div key={method.id} className="mb-4 border rounded-md p-4">
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Method
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {method.name}{" "}
                      {convertToLocale({
                        amount: method.amount!,
                        currency_code: cart?.currency_code,
                      })}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CartShippingMethodsSection
