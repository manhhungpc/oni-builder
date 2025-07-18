<script lang="ts">
    import type { Snippet } from "svelte";
    import { DropdownMenu, type WithoutChild } from "bits-ui";
    import type { DropdownItem } from "src/interface";

    type Props = {
        open?: boolean;
        trigger: Snippet;
        contentProps?: WithoutChild<DropdownMenu.ContentProps>;
        items: DropdownItem[];
        value?: any;
    };

    let { trigger, items, open = $bindable(false), value = $bindable(), contentProps }: Props = $props();
</script>

<DropdownMenu.Root bind:open>
    <DropdownMenu.Trigger>
        {@render trigger()}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
        sideOffset={20}
        class={`overflow-auto bg-dark-primary ${contentProps?.class}`}
        {...contentProps}
    >
        <DropdownMenu.RadioGroup
            bind:value
            onValueChange={(v) => {
                console.log("RadioGroup onValueChange:", v);
                value = v;
            }}
        >
            {#each items as item}
                <DropdownMenu.RadioItem
                    value={item.value}
                    class="flex items-center gap-2 hover:bg-black/80 py-3 px-4 cursor-pointer"
                    onclick={() => console.log("RadioItem clicked:", item.value)}
                >
                    {#snippet children({ checked })}
                        <img src={`${item.iconPath || ""}` + item.icon} alt={item.text} class="w-5 h-5" />
                        <p>{item.text}</p>
                    {/snippet}
                </DropdownMenu.RadioItem>
            {/each}
        </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
</DropdownMenu.Root>
